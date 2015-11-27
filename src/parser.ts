interface IParserResult<T> {
	success: boolean;
	consumed: boolean;
	value: T;
	rest: Token[];
	errors: ParserError[];
}

interface ParserError {
	expected: Token;
	got: Token;
	message?: string;
}

interface IParser<T> {
	(tokens: Token[]): IParserResult<T>;
}

function many<T>(parser: IParser<T>): IParser<T[]> {
	return (tokens) => {
		let rest = tokens;
		let values = new Array<T>();
		let consumed = false;

		while (true) {
			let result = parser(rest);
			consumed = consumed || result.consumed;

			if (result.success) {
				values.push(result.value);
				rest = result.rest;
			} else if(result.consumed) {
				return { success: false, consumed, value: undefined, rest: tokens, errors: result.errors };
			} else {
				return { success: true, consumed, value: values, rest, errors: [] };
			}
		}
	};
}

function optional<T>(parser: IParser<T>, fallback: T = null): IParser<T> {
	return (tokens) => {
		let result = parser(tokens);

		if (result.success || result.consumed) {
			return result;
		} else {
			return { success: true, consumed: false, value: fallback, rest: tokens, errors: [] };
		}
	};
}

function constant<T>(value: T): IParser<T> {
	return (tokens) => {
		return { success: true, consumed: false, value, rest: tokens, errors: [] };
	};
}

function create<T>(f: () => IterableIterator<IParser<any> | T>): IParser<T> {
	return (tokens) => {
		let generator = f();
		let value: any = undefined; // First call to next must be using undefined as per spec.
		let rest = tokens;
		let errors = new Array<ParserError>();
		let consumed = false;

		while (true) {
			let step = generator.next(value);
			
			if(step.done) {
				return { success: true, consumed, value: <T>step.value, rest, errors };
			}
			
			let parser = <IParser<any>>step.value;
			let result = parser(rest);
			consumed = consumed || result.consumed;

			if (result.success) {
				value = result.value;
				rest = result.rest;
				errors = result.errors;
			} else {
				return { success: false, consumed, value: undefined, rest: tokens, errors: errors.concat(result.errors) };
			}
		}
	};
}

function combine<T1, T2>(p1: IParser<T1>, p2: IParser<T2>): IParser<[T1, T2]> {
	return (tokens) => {
		let r1 = p1(tokens);
		
		let errors = r1.errors;
		let consumed = r1.consumed;

		if (r1.success) {
			let r2 = p2(r1.rest);
			errors = errors.concat(r2.errors);
			consumed = consumed || r2.consumed;
			
			if (r2.success) {
				return { success: true, consumed, value: [r1.value, r2.value], rest: r2.rest, errors };
			}
		}

		return { success: false, consumed, value: undefined, rest: tokens, errors };
	};
}

function choose<T>(...parsers: IParser<T>[]): IParser<T> {
	return (tokens) => {
		let errors = new Array<ParserError>();

		for (let parser of parsers) {
			let result = parser(tokens);

			if (result.success || result.consumed) {
				return result;
			} else {
				errors = errors.concat(result.errors);
			}
		}

		return { success: false, consumed: false, value: undefined, rest: tokens, errors };
	}
}

function choose_backtracking<T>(...parsers: IParser<T>[]): IParser<T> {
	return (tokens) => {
		let errors = new Array<ParserError>();

		for (let parser of parsers) {
			let result = parser(tokens);

			if (result.success) {
				return result;
			} else {
				errors = errors.concat(result.errors);
			}
		}

		return { success: false, consumed: false, value: undefined, rest: tokens, errors };
	}
}

function map<T, R>(parser: IParser<T>, f: (value: T) => R): IParser<R> {
	return (tokens) => {
		let result = parser(tokens);

		if (result.success) {
			return { success: true, consumed: result.consumed, value: f(result.value), rest: result.rest, errors: result.errors };
		} else {
			return { success: false, consumed: result.consumed, value: undefined, rest: tokens, errors: result.errors };
		}
	}
}

function exists<T>(parser: IParser<T>): IParser<boolean> {
	return (tokens) => {
		let result = parser(tokens);
		return { success: true, consumed: result.consumed, value: result.success, rest: result.rest, errors: result.errors };
	}
}

function token(kind: TokenKind, text?: string): IParser<TextSpan> {
	return (tokens) => {
		if (tokens && tokens.length > 0 && tokens[0].kind === kind && (typeof (text) === "undefined" || tokens[0].span.text === text)) {
			let rest = tokens.slice(1);
			return { success: true, consumed: true, value: tokens[0].span, rest, errors: [] };
		} else {
			let expected = { kind, span: { text, position: -1 } };
			let got = tokens[0];
			
			let error = { expected, got, "toString": function() {
				return "Expected " + (typeof(text) === "undefined" ? TokenKind[kind] : "'" + text + "'") + " but got '" + got.span.text + "'.";   
			}};
			
			return { success: false, consumed: false, value: undefined, rest: tokens, errors: [error] };
		}
	};
}

function get_caller(): string {
	let exception = <any>new Error();
	let stack = <string>exception.stack;
	
	const pattern = /(\S+)@(.+?):(\d+):(\d+)/g;
	pattern.exec(stack);
	pattern.exec(stack);
	let match = pattern.exec(stack);
	return match[1];
}

function fail<T>(): IParser<T> {
	let caller = get_caller();
	return (tokens) => {
		let error = { expected: <Token>null, got: <Token>null, "toString": () => ("Not implemented: " + caller) };
		return { success: false, consumed: false, value: undefined, rest: tokens, errors: [error] };
	};
}
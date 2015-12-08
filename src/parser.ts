/// <reference path="tokenizer.ts" />
"use strict";

import { TextSpan, Token, TokenKind } from "./tokenizer";

/**
 * 
 */
export interface IParserResult<T> {
	/**
	 * 
	 */
	success: boolean;
	/**
	 * 
	 */
	consumed: boolean;
	/**
	 * 
	 */
	value: T;
	/**
	 * 
	 */
	rest: Token[];
	/**
	 * 
	 */
	errors: ParserError[];
}

/**
 * 
 */
export interface ParserError {
	/**
	 * 
	 */
	expected: Token;
	/**
	 * 
	 */
	got: Token;
}

/**
 * 
 */
export interface IParser<T> {
	/**
	 * @param tokens
	 * @return 
	 */
	(tokens: Token[]): IParserResult<T>;
}

/**
 * @param parser
 * @return 
 */
export function many<T>(parser: IParser<T>): IParser<T[]> {
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
			} else if (result.consumed) {
				return { success: false, consumed, value: undefined, rest: tokens, errors: result.errors };
			} else {
				return { success: true, consumed, value: values, rest, errors: [] };
			}
		}
	};
}

/**
 * @param parser
 * @param fallback
 * @return 
 */
export function optional<T>(parser: IParser<T>, fallback: T = null): IParser<T> {
	return (tokens) => {
		let result = parser(tokens);

		if (result.success || result.consumed) {
			return result;
		} else {
			return { success: true, consumed: false, value: fallback, rest: tokens, errors: [] };
		}
	};
}

/**
 * @param value
 * @return 
 */
export function constant<T>(value: T): IParser<T> {
	return (tokens) => {
		return { success: true, consumed: false, value, rest: tokens, errors: [] };
	};
}

/**
 * @param f
 * @return 
 */
export function create<T>(f: () => IterableIterator<IParser<any> | T>): IParser<T> {
	return (tokens) => {
		let generator = f();
		let value: any = undefined; // First call to next must be using undefined as per spec.
		let rest = tokens;
		let errors = new Array<ParserError>();
		let consumed = false;

		while (true) {
			let step = generator.next(value);

			if (step.done) {
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

/**
 * @param p1
 * @param p2
 * @return
 */
export function combine<T1, T2>(p1: IParser<T1>, p2: IParser<T2>): IParser<[T1, T2]> {
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

/**
 * @param parsers
 * @return 
 */
export function choose<T>(...parsers: IParser<T>[]): IParser<T> {
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

export function choose_backtracking<T>(...parsers: IParser<T>[]): IParser<T> {
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

/**
 * @param parser
 * @param f
 * @return
 */
export function map<T, R>(parser: IParser<T>, f: (value: T) => R): IParser<R> {
	return (tokens) => {
		let result = parser(tokens);

		if (result.success) {
			return { success: true, consumed: result.consumed, value: f(result.value), rest: result.rest, errors: result.errors };
		} else {
			return { success: false, consumed: result.consumed, value: undefined, rest: tokens, errors: result.errors };
		}
	}
}

/**
 * @param parser
 * @return
 */
export function exists<T>(parser: IParser<T>): IParser<boolean> {
	return (tokens) => {
		let result = parser(tokens);
		return { success: true, consumed: result.consumed, value: result.success, rest: result.rest, errors: result.errors };
	}
}

/**
 * @param parser
 * @name
 * @return
 */
export function name<T>(parser: IParser<T>, name: string): IParser<T> {
	return (tokens) => {
		let result = parser(tokens);

		if (result.errors.length > 0) {
			let span = { text: name, position: -1 };
			let expected = { kind: TokenKind.eof, span };
			let got = result.errors[0].got;
			let error = { expected, got };
			result.errors = [error];
		}

		return result;
	}
}

/**
 * @param kind
 * @param text
 * @return
 */
export function token(kind: TokenKind, text?: string): IParser<TextSpan> {
	return (tokens) => {
		if (tokens && tokens.length > 0 && tokens[0].kind === kind && (typeof (text) === "undefined" || tokens[0].span.text === text)) {
			let rest = tokens.slice(1);
			return { success: true, consumed: true, value: tokens[0].span, rest, errors: [] };
		} else {
			let span = { text, position: -1 };
			let expected = { kind, span };
			let error = { expected, got: tokens[0] };

			return { success: false, consumed: false, value: undefined, rest: tokens, errors: [error] };
		}
	};
}

export function fail<T>(): IParser<T> {
	return (tokens) => {
		let error = { expected: <Token>null, got: <Token>null };
		return { success: false, consumed: false, value: undefined, rest: tokens, errors: [error] };
	};
}
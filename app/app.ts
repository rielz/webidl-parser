/// <reference path="../lib/tokenizer.d.ts" />
/// <reference path="../lib/parser.d.ts" />
/// <reference path="../lib/webidl.d.ts" />
/// <reference path="../lib/typescript.d.ts" />

"use strict";

window.addEventListener("load", (e) => {
	const input = <HTMLTextAreaElement>document.querySelector("textarea#input");
	const output = <HTMLTextAreaElement>document.querySelector("textarea#output");
	
	input.addEventListener("change", (e) => {
		let iterable = tokenize(www.webidl.COMMON + input.value);
		let tokens = Array.from(iterable).filter(t => t.kind != TokenKind.whitespace && t.kind != TokenKind.comment);
		
		let parser = www.webidl.grammar.Definitions();
		let definitions = parser(tokens);
		definitions.success = definitions.success && definitions.rest.length === 1 && definitions.rest[0].kind === TokenKind.eof;

		if(definitions.success) {
			let generator = new microsoft.typescript.Generator();
			
			let statements = definitions.value.map((def) => def.accept(generator)).reduce((list, item) => {
				return list.concat(item);
			}, []);
			
			let writer = new microsoft.typescript.Writer();
			let emitter = new microsoft.typescript.Emitter(writer);
			
			statements.forEach((stmt) => stmt.accept(emitter));
			
			output.value = writer.toString();
		} else {
			output.value = JSON.stringify(definitions.errors, null, "\t");
		}
	});
});
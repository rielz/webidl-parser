/// <reference path="../src/tokenizer.ts" />
/// <reference path="../src/parser.ts" />
/// <reference path="../src/webidl.ts" />
/// <reference path="../src/typescript.ts" />
"use strict";

import tokenize from "../src/tokenizer";
import { TokenKind } from "../src/tokenizer";
import { Writer, Emitter, Generator } from "../src/typescript";
import * as webidl from "../src/webidl";

window.addEventListener("load", (e) => {
	const input = <HTMLTextAreaElement>document.querySelector("textarea#input");
	const output = <HTMLTextAreaElement>document.querySelector("textarea#output");
	
	input.addEventListener("change", (e) => {
		let iterable = tokenize(input.value);
		let tokens = Array.from(iterable).filter(t => t.kind != TokenKind.whitespace && t.kind != TokenKind.comment);

		let parser = webidl.grammar.Definitions();
		let definitions = parser(tokens);
		definitions.success = definitions.success && definitions.rest.length === 1 && definitions.rest[0].kind === TokenKind.eof;

		if(definitions.success) {
			let writer = new Writer();
			let emitter = new Emitter(writer);
			let generator = new Generator();
			
			definitions.value.map((def) => def.accept(generator)).reduce((list, item) => {
				return list.concat(item);
			}, []).forEach((stmt) => stmt.accept(emitter));
			
			output.value = writer.toString();
		} else {
			output.value = JSON.stringify(definitions.errors, null, "\t");
		}
	});
});
/// <reference path="node.d.ts" />
/// <reference path="jsdom.d.ts" />
/// <reference path="../src/tokenizer.ts" />
/// <reference path="../src/parser.ts" />
/// <reference path="../src/webidl.ts" />
/// <reference path="../src/typescript.ts" />
"use strict";

import * as fs from "fs";
import * as jsdom from "jsdom";

import tokenize from "../src/tokenizer";
import { TokenKind } from "../src/tokenizer";
import * as typescript from "../src/typescript";
import * as webidl from "../src/webidl";

const input = "http://www.w3.org/html/wg/drafts/html/master/single-page.html";
const output = "../specs/html5.d.ts";

jsdom.env(input, function(e, window) {
	if (e) {
		console.error("Errors in HTTP/HTML!");
		return;
	}

	let elements = window.document.querySelectorAll("pre.idl:not(.extract)");
	let parts = Array.from(elements).map((pre) => pre.textContent);
	let idl = parts.join("\n");

	let tokens = tokenize(idl);
	let rest = Array.from(tokens).filter((token) => token.kind != TokenKind.whitespace && token.kind != TokenKind.comment);
	let parser = webidl.grammar.Definitions();
	let result = parser(rest);
	result.success = result.success && result.rest.length === 1 && result.rest[0].kind === TokenKind.eof;

	if (result.success) {
		let writer = new typescript.Writer();
		let emitter = new typescript.Emitter(writer);
		let generator = new typescript.Generator();

		let statements = result.value.map(def => def.accept(generator)).reduce((list, item) => list.concat(item), []);

		statements.forEach((stmt) => {
			stmt.accept(emitter);
		});

		let dts = writer.toString();

		fs.writeFile(output, dts);
		console.info("written");
	} else {
		console.error("Errors in IDL!");
		
		for(let err of result.errors) {
			console.warn(err.message);
			
			if(err.got) {
				let from = err.got.span.position - 100;
				let to = err.got.span.position + err.got.span.text.length + 100;
				
				let part = idl.substring(from, to).replace(/\n/g, "\\n");
				console.info(part);
			}
		}
		
		return;
	}
});
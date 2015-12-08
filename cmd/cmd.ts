/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/jsdom/jsdom.d.ts" />
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

function extract(doc: Document): string {
	let elements = window.document.querySelectorAll("pre.idl:not(.extract)");
	let parts = Array.from(elements).map((pre) => pre.textContent);
	return parts.join("\n");
}

function parse(idl: string): webidl.model.Definition[] {
	let tokens = tokenize(idl);
	let rest = Array.from(tokens).filter((token) => token.kind != TokenKind.whitespace && token.kind != TokenKind.comment);
	let parser = webidl.grammar.Definitions();
	let result = parser(rest);
	result.success = result.success && result.rest.length === 1 && result.rest[0].kind === TokenKind.eof;
	
	if(result) {
		return result.value;
	} else {
		return null;
	}
}

function generate(defs: webidl.model.Definition[]): typescript.model.Statement[] {
	let generator = new typescript.Generator();
	return defs.map(def => def.accept(generator)).reduce((list, item) => list.concat(item), []);
}

function emit(stmts: typescript.model.Statement[]): string {
	let writer = new typescript.Writer();
	let emitter = new typescript.Emitter(writer);
	
	stmts.forEach((stmt) => {
		stmt.accept(emitter);
	});
	
	return writer.toString();
}

jsdom.env(input, function(e, window) {
	if (e) {
		console.error("Errors in HTTP/HTML!");
		return;
	}

	let idl = extract(window.document);
	let defs = parse(idl);
	let stmts = generate(defs);
	let tsd = emit(stmts);
	
	fs.writeFile(output, tsd, (e) => {
		if(e) {
			console.error(e.message);
		} else {
			console.info(`generated file '$(output)'.`);
		}
	});
});
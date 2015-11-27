"use strict";

export enum TokenKind {
	integer,
	float,
	identifier,
	string,
	whitespace,
	comment,
	other,
	
	keyword,
	
	eof,
}

export interface TextSpan {
	text: string;
	position: number;
}

export interface Token {
	kind: TokenKind;
	span: TextSpan;
}

export const KEYWORDS = [
	"-Infinity", "...", "ArrayBuffer", "ByteString", "DOMException", "DOMString", "DataView", "Error", "Float32Array",
	"Float64Array", "FrozenArray", "Infinity", "Int16Array", "Int32Array", "Int8Array", "NaN", "Promise", "RegExp",
	"USVString", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray", "any", "attribute", "boolean", "byte",
	"callback", "const", "deleter", "dictionary", "double", "enum", "false", "float", "getter", "implements", "inherit",
	"interface", "iterable", "legacycaller", "long", "maplike", "null", "object", "octet", "optional", "or", "partial",
	"readonly", "required", "sequence", "serializer", "setlike", "setter", "short", "static", "stringifier", "true",
	"typedef", "unrestricted", "unsigned", "void"
];

export default function* tokenize(input: string, position: number = 0): IterableIterator<Token> {
	const integer_pattern = /-?([1-9][0-9]*|0[Xx][0-9A-Fa-f]+|0[0-7]*)/y;
	const float_pattern = /-?(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][+-]?[0-9]+)?|[0-9]+[Ee][+-]?[0-9]+)/y;
	const identifier_pattern = /_?[A-Za-z][0-9A-Z_a-z-]*/y;
	const string_pattern = /"[^"]*"/y;
	const whitespace_pattern = /[\t\n\r ]+/y;
	const comment_pattern = /\/\/.*|\/\*(.|\n)*?\*\//y;
	const other_pattern = /[^\t\n\r 0-9A-Za-z]/y;
	
	function escape(l: string): string {
		return l.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
	
	const keyword_pattern = new RegExp(KEYWORDS.map(k => {
		return "(" + escape(k) + ")";
	}).join("|"), "y");
	
	while(position < input.length) {
		// Order is relevant:
		let matches = [
			[TokenKind.keyword, keyword_pattern.exec(input)],
			[TokenKind.integer, integer_pattern.exec(input)],
			[TokenKind.float, float_pattern.exec(input)],
			[TokenKind.identifier, identifier_pattern.exec(input)],
			[TokenKind.string, string_pattern.exec(input)],
			[TokenKind.whitespace, whitespace_pattern.exec(input)],
			[TokenKind.comment, comment_pattern.exec(input)],
			[TokenKind.other, other_pattern.exec(input)],
		].filter(p => p[1] != null);

		let longest_match = matches.reduce((p, c) => {
			if(!p) {
				return c;
			}
			
			let prev_match = <RegExpExecArray>p[1];
			let current_match = <RegExpExecArray>c[1];
			
			if(current_match[0].length > prev_match[0].length) {
				return c;
			} else {
				return p;
			}
		}, null);
		
		if(!longest_match) {
			throw "Invalid input";
		}
		
		let kind = <TokenKind>longest_match[0];
		let match = <RegExpExecArray>longest_match[1];
		
		let span = { text: match[0], position };
		let token = { kind, span };
		
		position += match[0].length;
		integer_pattern.lastIndex = position;
		float_pattern.lastIndex = position;
		identifier_pattern.lastIndex = position;
		string_pattern.lastIndex = position;
		whitespace_pattern.lastIndex = position;
		comment_pattern.lastIndex = position;
		float_pattern.lastIndex = position;
		other_pattern.lastIndex = position;
		keyword_pattern.lastIndex = position;
		
		yield token;
	}
	
	yield { kind: TokenKind.eof, span: { text: "<eof>", position }};
}
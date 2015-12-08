/// <reference path="tokenizer.ts" />
/// <reference path="webidl.ts" />
"use strict";

import { TextSpan } from "./tokenizer";
import * as webidl from "./webidl";

export class Writer {
	private text: string;
	private indentation: number;
	private begin: boolean;

	constructor(public linebreak: string = "\r\n", public space: string = " ", public tab: string = "\t") {
		this.text = "";
		this.indentation = 0;
		this.begin = true;
	}

	append(...text: string[]): Writer {
		if (this.begin) {
			this.text += this.tab.repeat(this.indentation);
			this.begin = false;
		}

		this.text += text.join(this.space);

		if (text.length > 0) {
			this.begin = false;
		}
		
		return this;
	}

	appendln(...text: string[]): Writer {
		this.append(...text, this.linebreak);
		this.begin = true;
		return this;
	}

	indent(): number {
		return this.indentation += 1;
	}

	unindent(): number {
		return this.indentation = Math.max(0, this.indentation - 1);
	}

	toString(): string {
		return this.text;
	}
}

type CompareFunction<T> = (a: T, b: T) => number;

function cmp_many<T>(...cmps: CompareFunction<T>[]): CompareFunction<T> {
	return (a, b) => {
		return 0;
	};
}

type AttributeSelector<T, P> = (v: T) => P;

function cmp_map<T, P>(cmp: CompareFunction<P>, selector: AttributeSelector<T, P>): CompareFunction<T> {
	return (a, b) => {
		let a_p = selector(a);
		let b_p = selector(b);

		return cmp(a_p, b_p);
	}
}

class ClassificationVisitor implements ISyntaxVisitor<number> {
	visitMethodMember(mem: model.MethodMember): number {
		return 0;
	}
	
	visitAttributeMember(mem: model.AttributeMember): number {
		return 1;
	}
}

function cmp_mem_type(a: model.Statement, b: model.Statement): number {
	let visitor = new ClassificationVisitor();
	let a_v = a.accept(visitor);
	let b_v = b.accept(visitor);
	
	return cmp_num(a_v, b_v);
}

function cmp_span(a: TextSpan, b: TextSpan): number {
	if (a && !b) {
		return 1;
	}

	if (!a && b) {
		return -1;
	}

	if (a && b) {
		return cmp_str(a.text, b.text);
	}

	return 0;
}

function cmp_str(a: string, b: string): number {
	return a.localeCompare(b);
}

function cmp_num(a: number, b: number): number {
	return a - b;
}

export class Emitter implements ISyntaxVisitor<void> {
	constructor(private writer: Writer) {

	}

	visitInterface(stmt: model.Interface): void {
		this.writer.append("interface", stmt.identifier.text);

		if (stmt.inheritance.sort(cmp_span)) {
			let spans = stmt.inheritance.filter((span) => span != null).map((span) => span.text);

			if (spans.length > 0) {
				let inheritance = spans.join(", ");
				this.writer.append("", "extends", inheritance);
			}
		}

		this.writer.appendln("", "{");
		this.writer.indent();

		let cmp = cmp_many<model.Statement>(cmp_mem_type, cmp_map(cmp_span, (mem: model.Statement) => mem.identifier));
		for (let mem of stmt.members.sort(cmp)) {
			mem.accept(this);
		}

		this.writer.unindent();
		this.writer.appendln("}");
	}

	visitDeclaration(stmt: model.Declaration): void {
		this.writer.append("declare", "var", stmt.identifier.text);
		this.writer.append(":", "");
		stmt.type.accept(this);
		this.writer.appendln(";");
	}

	visitTypedef(stmt: model.Typedef): void {
		this.writer.append("declare", "type", stmt.identifier.text, "=", "");
		stmt.type.accept(this);
		this.writer.appendln(";");
	}

	visitEnum(stmt: model.Enum): void {
		let options = stmt.options.map((span) => span.text).join(" | ");
		this.writer.append("declare", "type", stmt.identifier.text, "=", options);
		this.writer.appendln(";");
	}

	visitMethodMember(mem: model.MethodMember): void {
		if (!mem.identifier) {
			return; // TODO: Handle unnamed method members.
		}

		this.writer.append(mem.identifier.text);
		this.writer.append("(");

		for (let [i, arg] of mem.args.entries()) {
			arg.accept(this);

			if (i !== mem.args.length - 1) {
				this.writer.append(",", "");
			}
		}

		this.writer.append(")");
		this.writer.append(":", "");

		if (mem.rtype) {
			mem.rtype.accept(this);
		} else {
			this.writer.append("void");
		}

		this.writer.appendln(";");
	}

	visitArgument(arg: model.Argument): void {
		this.writer.append(arg.identifier.text);

		if (arg.optional) {
			this.writer.append("?");
		}

		this.writer.append(":", arg.type.span.text);
	}

	visitAttributeMember(mem: model.AttributeMember): void {
		this.writer.append(mem.identifier.text);

		if (mem.optional) {
			this.writer.append("?");
		}

		this.writer.append(":", "");
		mem.type.accept(this);
		this.writer.appendln(";");
	}

	visitSimpleType(type: model.SimpleType): void {
		this.writer.append(type.span.text);

		if (type.optional) {
			// TODO: Needed?
			// this.writer.append("?");
		}
	}

	visitConstructedType(type: model.ConstructedType): void {
		this.writer.appendln("{");
		this.writer.indent();

		let cmp = cmp_many<model.Statement>(cmp_mem_type, cmp_map(cmp_span, (mem: model.Statement) => mem.identifier));
		for (let stmt of type.statements.sort(cmp)) {
			stmt.accept(this);
		}

		this.writer.unindent();
		this.writer.append("}");
	}

	visitFunctionType(type: model.FunctionType): void {
		this.writer.append("(");

		for (let [i, arg] of type.args.entries()) {
			arg.accept(this);

			if (i !== type.args.length - 1) {
				this.writer.append(",", "");
			}
		}

		this.writer.append(")", "=>", "");

		if (type.rtype) {
			type.rtype.accept(this);
		} else {
			this.writer.append("void");
		}

		this.writer.appendln(";");
	}
}

export class TypeMapping implements webidl.ISyntaxVisitor<model.SimpleType> {

	private primitive(text: string): string {
		switch (text) {
			case "ByteString":
			case "DOMString":
			case "USVString":
				return "string";
			case "byte":
			case "octet":
				return "number";
			default:
				return text;
		}
	}

	visitSimpleType(type: webidl.model.SimpleType): model.SimpleType {

		let text = this.primitive(type.span.text);
		let span = { text, position: - 1 };
		return new model.SimpleType(false, span);
	}

	visitNullableType(type: webidl.model.NullableType): model.SimpleType {
		let base = type.type.accept(this);
		return new model.SimpleType(true, base.span);
	}

	visitSequenceType(type: webidl.model.SequenceType): model.SimpleType {
		let base = type.type.accept(this);
		let span = { text: base.span.text + "[]", position: -1 };
		return new model.SimpleType(false, span);
	}

	visitFrozenArrayType(type: webidl.model.FrozenArrayType): model.SimpleType {
		let base = type.type.accept(this);
		let span = { text: base.span.text + "[]", position: -1 };
		return new model.SimpleType(false, span);
	}

	visitPromiseType(type: webidl.model.PromiseType): model.SimpleType {
		let base = type.type.accept(this);
		let span = { text: "Promise<" + base.span.text + ">", position: -1 };
		return new model.SimpleType(false, span);
	}

	visitUnionType(type: webidl.model.UnionType): model.SimpleType {
		let text = "(" + type.types.map((type) => type.accept(this)).map((type) => type.span.text).join(" | ") + ")";
		let span = { text, position: - 1 };
		return new model.SimpleType(false, span);
	}

	visitFloatType(type: webidl.model.FloatType): model.SimpleType {
		let span = { text: "number", position: -1 };
		return new model.SimpleType(false, span);
	}

	visitIntegerType(type: webidl.model.IntegerType): model.SimpleType {
		let span = { text: "number", position: -1 };
		return new model.SimpleType(false, span);
	}
}

function flatten<T>(lists: T[][]): T[] {
	return lists.reduce((list, item) => {
		return list.concat(item);
	}, []);
}

export class Generator implements webidl.ISyntaxVisitor<model.Statement[]> {
	private mapping: TypeMapping;

	constructor() {
		this.mapping = new TypeMapping();
	}

	private argument(arg: webidl.model.Argument): model.Argument {
		let type = arg.type.accept(this.mapping);
		return new model.Argument(arg.identifier, arg.optional, type);
	}

	visitExtendedAttribute(attr: webidl.model.ExtendedAttribute): model.Statement[] {
		return [];
	}

	visitExtendedAttributeArgList(attr: webidl.model.ExtendedAttributeArgList): model.Statement[] {
		return [];
	}

	visitExtendedAttributeIdent(attr: webidl.model.ExtendedAttributeIdent): model.Statement[] {
		return [];
	}

	visitExtendedAttributeIdentList(attr: webidl.model.ExtendedAttributeIdentList): model.Statement[] {
		return [];
	}

	visitExtendedAttributeNamedArgList(attr: webidl.model.ExtendedAttributeNamedArgList): model.Statement[] {
		return [];
	}

	visitCallbackDefinition(def: webidl.model.CallbackDefinition): model.Statement[] {
		let rtype = def.rtype ? def.rtype.accept(this.mapping) : null;
		let args = def.args.map((arg) => this.argument(arg));
		let type = new model.FunctionType(rtype, args);

		return [
			new model.Typedef(def.identifier, type)
		];
	}

	visitInterfaceDefinition(def: webidl.model.InterfaceDefinition): model.Statement[] {
		let members = <model.InterfaceMember[]>flatten(def.members.filter((mem) => !(mem instanceof webidl.model.StaticMember)).map((mem) => mem.accept(this)));
		let stmt: model.Statement = new model.Interface(def.identifier, [def.inheritance], members);

		let ref = new model.SimpleType(false, def.identifier);

		let static_statements = [
			new model.AttributeMember({ text: "prototype", position: - 1 }, false, ref, null),
			...flatten(def.members.filter((mem) => mem instanceof webidl.model.StaticMember).map((mem) => mem.accept(this)))
		];

		def.getConstructors().forEach((attr) => {
			if (attr instanceof webidl.model.ExtendedAttributeArgList) {
				let args = attr.args.map((arg) => this.argument(arg));
				let ctor = new model.MethodMember({ text: "new", position: - 1 }, false, ref, args);
				static_statements.push(ctor);
			} else {
				let ctor = new model.MethodMember({ text: "new", position: - 1 }, false, ref, []);
				static_statements.push(ctor);
			}
		});


		if (static_statements.length > 1) {
			let decl = new model.Declaration(def.identifier, new model.ConstructedType(static_statements));
			return [stmt, decl];
		} else {
			return [stmt];
		}
	}

	visitDictionaryDefinition(def: webidl.model.DictionaryDefinition): model.Statement[] {
		let members = <model.InterfaceMember[]>flatten(def.members.map((mem) => mem.accept(this)));

		return [
			new model.Interface(def.identifier, [def.inheritance], members)
		];
	}

	visitEnumDefinition(def: webidl.model.EnumDefinition): model.Statement[] {
		return [
			new model.Enum(def.identifier, def.values),
		];
	}

	visitTypedef(def: webidl.model.Typedef): model.Statement[] {
		return [
			new model.Typedef(def.identifier, def.type.accept(this.mapping)),
		]
	}

	visitImplementsStatement(def: webidl.model.ImplementsStatement): model.Statement[] {
		let iface = new webidl.model.InterfaceDefinition(def.identifier, def.name, []);
		iface.attributes = [];
		return iface.accept(this);
	}

	visitConstMember(mem: webidl.model.ConstMember): model.Statement[] {
		let type = mem.type.accept(this.mapping);
		let attr = new model.AttributeMember(mem.identifier, false, type, null);

		return [attr];
	}

	visitAttributeMember(mem: webidl.model.AttributeMember): model.Statement[] {
		let type = mem.type.accept(this.mapping);
		let attr = new model.AttributeMember(mem.identifier, false, type, null);

		return [attr];
	}

	visitOperationMember(mem: webidl.model.OperationMember): model.Statement[] {
		let args = mem.args.map((arg) => this.argument(arg));
		let type = mem.rtype ? mem.rtype.accept(this.mapping) : null;
		let op = new model.MethodMember(mem.identifier, false, type, args);
		return [op];
	}

	visitStaticMember(mem: webidl.model.StaticMember): model.Statement[] {
		return [];
	}

	visitIterableMember(mem: webidl.model.IterableMember): model.Statement[] {
		return [];
	}

	visitMaplikeMember(mem: webidl.model.MaplikeMember): model.Statement[] {
		return [];
	}

	visitSetlikeMember(mem: webidl.model.SetlikeMember): model.Statement[] {
		return [];
	}

	visitStringifierMember(mem: webidl.model.StringifierMember): model.Statement[] {
		if (mem.mem) {
			return mem.accept(this);
		} else {
			return [];
		}
	}

	visitDictionaryMember(mem: webidl.model.DictionaryMember): model.Statement[] {
		let type = mem.type.accept(this.mapping);
		let stmt = new model.AttributeMember(mem.identifier, true, type, null);
		return [stmt];
	}
}

export interface ISyntax {
	accept<T>(visitor: ISyntaxVisitor<T>): T;
}

export interface ISyntaxVisitor<T> {
	visitInterface?(stmt: model.Interface): T;
	visitDeclaration?(stmt: model.Declaration): T;
	visitTypedef?(stmt: model.Typedef): T;
	visitEnum?(stmt: model.Enum): T;
	visitMethodMember?(mem: model.MethodMember): T;
	visitArgument?(arg: model.Argument): T;
	visitAttributeMember?(mem: model.AttributeMember): T;
	visitConstructedType?(type: model.ConstructedType): T;
	visitSimpleType?(type: model.SimpleType): T;
	visitFunctionType?(type: model.FunctionType): T;
}

export namespace model {
	export abstract class Statement implements ISyntax {
		identifier: TextSpan;

		constructor(identifier: TextSpan) {
			this.identifier = identifier;
		}

		abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
	}

	export abstract class Expression implements ISyntax {
		abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
	}

	export class Interface extends Statement {
		inheritance: TextSpan[];
		members: InterfaceMember[];

		constructor(identifier: TextSpan, inheritance: TextSpan[], members: InterfaceMember[]) {
			super(identifier);
			this.inheritance = inheritance;
			this.members = members;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitInterface(this);
		}
	}

	export abstract class InterfaceMember extends Statement {
		optional: boolean;

		constructor(identifier: TextSpan, optional: boolean) {
			super(identifier);
			this.optional = optional;
		}
	}

	export class MethodMember extends InterfaceMember {
		rtype: Type;
		args: Argument[];

		constructor(identifier: TextSpan, optional: boolean, rtype: Type, args: Argument[]) {
			super(identifier, optional);
			this.rtype = rtype;
			this.args = args;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitMethodMember(this);
		}
	}

	export class Argument implements ISyntax {
		identifier: TextSpan;
		optional: boolean;
		type: SimpleType;

		constructor(identifier: TextSpan, optional: boolean, type: SimpleType) {
			this.identifier = identifier;
			this.optional = optional;
			this.type = type;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitArgument(this);
		}
	}

	export class AttributeMember extends InterfaceMember {
		type: Type;
		def: Value;

		constructor(identifier: TextSpan, optional: boolean, type: Type, def: Value) {
			super(identifier, optional);
			this.type = type;
			this.def = def;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitAttributeMember(this);
		}
	}

	export class Declaration extends Statement {
		type: Type;

		constructor(identifier: TextSpan, type: Type) {
			super(identifier);
			this.type = type;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitDeclaration(this);
		}
	}

	export class Typedef extends Statement {
		type: Type;

		constructor(identifier: TextSpan, type: Type) {
			super(identifier);
			this.type = type;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitTypedef(this);
		}
	}

	export class Enum extends Statement {
		options: TextSpan[];

		constructor(identifier: TextSpan, options: TextSpan[]) {
			super(identifier);
			this.options = options;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitEnum(this);
		}
	}

	export abstract class Type extends Expression {
		abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
	}

	export class ConstructedType extends Type {
		statements: Statement[];

		constructor(statements: Statement[]) {
			super();
			this.statements = statements;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitConstructedType(this);
		}
	}

	export class SimpleType extends Type {
		optional: boolean;
		span: TextSpan;

		constructor(optional: boolean, span: TextSpan) {
			super();
			this.optional = optional;
			this.span = span;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitSimpleType(this);
		}
	}

	export class FunctionType extends Type {
		rtype: Type;
		args: Argument[];

		constructor(rtype: Type, args: Argument[]) {
			super();
			this.rtype = rtype;
			this.args = args;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return visitor.visitFunctionType(this);
		}
	}

	export class Value extends Expression {
		span: TextSpan;

		constructor(span: TextSpan) {
			super();
			this.span = span;
		}

		accept<T>(visitor: ISyntaxVisitor<T>): T {
			return null;
		}
	}
}
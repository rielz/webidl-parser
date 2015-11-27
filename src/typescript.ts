"use strict";

namespace microsoft.typescript {
	export class Writer {
		private text: string;
		private indentation: number;
		private begin: boolean;

		constructor(public linebreak: string = "\r\n", public space: string = " ", public tab: string = "\t") {
			this.text = "";
			this.indentation = 0;
			this.begin = true;
		}

		append(...text: string[]): void {
			if (this.begin) {
				this.text += this.tab.repeat(this.indentation);
				this.begin = false;
			}

			this.text += text.join(this.space);

			if (text.length > 0) {
				this.begin = false;
			}
		}

		appendln(...text: string[]): void {
			this.append(...text, this.linebreak);
			this.begin = true;
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

	export class Emitter implements ISyntaxVisitor<void> {
		constructor(private writer: Writer) {

		}

		visitInterface(stmt: model.Interface): void {
			this.writer.append("interface", stmt.identifier.text);

			if (stmt.inheritance) {
				let spans = stmt.inheritance.filter((span) => span != null).map((span) => span.text);

				if (spans.length > 0) {
					let inheritance = spans.join(", ");
					this.writer.append("", "extends", inheritance);
				}
			}

			this.writer.appendln("", "{");

			this.writer.indent();

			for (let mem of stmt.members) {
				mem.accept(this);
			}

			this.writer.unindent();
			this.writer.appendln("}");
			this.writer.appendln();
		}

		visitDeclaration(stmt: model.Declaration): void {
			this.writer.append("declare", "var", stmt.identifier.text);
			this.writer.append(":", "");
			stmt.type.accept(this);
			this.writer.appendln(";");
			this.writer.appendln();
		}

		visitTypedef(stmt: model.Typedef): void {
			this.writer.append("declare", "type", stmt.identifier.text, "=", "");
			stmt.type.accept(this);
			this.writer.appendln(";");
		}

		visitEnum(stmt: model.Enum): void {
			let span = { text: "string", position: -1 };
			let type = new model.SimpleType(false, span);
			let typedef = new model.Typedef(stmt.identifier, type);
			typedef.accept(this);
			
			let options = stmt.options.map((span) => span.text).join(" | ");
			this.writer.appendln("//", "declare", "type", stmt.identifier.text, "=", options);
		}

		visitMethodMember(mem: model.MethodMember): void {
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

			for (let stmt of type.statements) {
				stmt.accept(this);
			}

			this.writer.unindent();
			this.writer.append("}");
		}
	}

	export class TypeMapping implements www.webidl.ISyntaxVisitor<model.SimpleType> {

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

		visitSimpleType(type: www.webidl.model.SimpleType): model.SimpleType {

			let text = this.primitive(type.span.text);
			let span = { text, position: - 1 };
			return new model.SimpleType(false, span);
		}

		visitNullableType(type: www.webidl.model.NullableType): model.SimpleType {
			let base = type.type.accept(this);
			return new model.SimpleType(true, base.span);
		}

		visitSequenceType(type: www.webidl.model.SequenceType): model.SimpleType {
			let base = type.type.accept(this);
			let span = { text: base.span.text + "[]", position: -1 };
			return new model.SimpleType(false, span);
		}

		visitFrozenArrayType(type: www.webidl.model.FrozenArrayType): model.SimpleType {
			let base = type.type.accept(this);
			let span = { text: base.span.text + "[]", position: -1 };
			return new model.SimpleType(false, span);
		}

		visitPromiseType(type: www.webidl.model.PromiseType): model.SimpleType {
			let base = type.type.accept(this);
			let span = { text: "Promise<" + base.span.text + ">", position: -1 };
			return new model.SimpleType(false, span);
		}

		visitUnionType(type: www.webidl.model.UnionType): model.SimpleType {
			let text = "(" + type.types.map((type) => type.accept(this)).map((type) => type.span.text).join(" | ") + ")";
			let span = { text, position: - 1 };
			return new model.SimpleType(false, span);
		}

		visitFloatType(type: www.webidl.model.FloatType): model.SimpleType {
			let span = { text: "number", position: -1 };
			return new model.SimpleType(false, span);
		}

		visitIntegerType(type: www.webidl.model.IntegerType): model.SimpleType {
			let span = { text: "number", position: -1 };
			return new model.SimpleType(false, span);
		}
	}

	function flatten<T>(lists: T[][]): T[] {
		return lists.reduce((list, item) => {
			return list.concat(item);
		}, []);
	}

	export class Generator implements www.webidl.ISyntaxVisitor<model.Statement[]> {
		private mapping: TypeMapping;

		constructor() {
			this.mapping = new TypeMapping();
		}

		private argument(arg: www.webidl.model.Argument): model.Argument {
			let type = arg.type.accept(this.mapping);
			return new model.Argument(arg.identifier, arg.optional, type);
		}

		visitExtendedAttribute(attr: www.webidl.model.ExtendedAttribute): model.Statement[] {
			return [];
		}

		visitExtendedAttributeArgList(attr: www.webidl.model.ExtendedAttributeArgList): model.Statement[] {
			return [];
		}

		visitExtendedAttributeIdent(attr: www.webidl.model.ExtendedAttributeIdent): model.Statement[] {
			return [];
		}

		visitExtendedAttributeIdentList(attr: www.webidl.model.ExtendedAttributeIdentList): model.Statement[] {
			return [];
		}

		visitExtendedAttributeNamedArgList(attr: www.webidl.model.ExtendedAttributeNamedArgList): model.Statement[] {
			return [];
		}

		visitInterfaceDefinition(def: www.webidl.model.InterfaceDefinition): model.Statement[] {
			let members = <model.InterfaceMember[]>flatten(def.members.filter((mem) => !(mem instanceof www.webidl.model.StaticMember)).map((mem) => mem.accept(this)));
			let stmt: model.Statement = new model.Interface(def.identifier, [def.inheritance], members);

			let ref = new model.SimpleType(false, def.identifier);

			let static_statements = [
				new model.AttributeMember({ text: "prototype", position: - 1 }, false, ref, null),
				...flatten(def.members.filter((mem) => mem instanceof www.webidl.model.StaticMember).map((mem) => mem.accept(this)))
			];

			def.getConstructors().forEach((attr) => {
				if (attr instanceof www.webidl.model.ExtendedAttributeArgList) {
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

		visitDictionaryDefinition(def: www.webidl.model.DictionaryDefinition): model.Statement[] {
			let members = <model.InterfaceMember[]>flatten(def.members.map((mem) => mem.accept(this)));

			return [
				new model.Interface(def.identifier, [def.inheritance], members)
			];
		}

		visitEnumDefinition(def: www.webidl.model.EnumDefinition): model.Statement[] {
			return [
				new model.Enum(def.identifier, def.values),
			];
		}

		visitTypedef(def: www.webidl.model.Typedef): model.Statement[] {
			return [
				new model.Typedef(def.identifier, def.type.accept(this.mapping)),
			]
		}

		visitImplementsStatement(def: www.webidl.model.ImplementsStatement): model.Statement[] {
			let iface = new www.webidl.model.InterfaceDefinition(def.identifier, def.name, []);
			iface.attributes = [];
			return iface.accept(this);
		}

		visitConstMember(mem: www.webidl.model.ConstMember): model.Statement[] {
			let type = mem.type.accept(this.mapping);
			let attr = new model.AttributeMember(mem.identifier, false, type, null);

			return [attr];
		}

		visitAttributeMember(mem: www.webidl.model.AttributeMember): model.Statement[] {
			let type = mem.type.accept(this.mapping);
			let attr = new model.AttributeMember(mem.identifier, false, type, null);

			return [attr];
		}

		visitOperationMember(mem: www.webidl.model.OperationMember): model.Statement[] {
			let args = mem.args.map((arg) => this.argument(arg));
			let type = mem.rtype ? mem.rtype.accept(this.mapping) : null;
			let op = new model.MethodMember(mem.identifier, false, type, args);
			return [op];
		}

		visitStaticMember(mem: www.webidl.model.StaticMember): model.Statement[] {
			return [];
		}

		visitIterableMember(mem: www.webidl.model.IterableMember): model.Statement[] {
			return [];
		}

		visitMaplikeMember(mem: www.webidl.model.MaplikeMember): model.Statement[] {
			return [];
		}

		visitSetlikeMember(mem: www.webidl.model.SetlikeMember): model.Statement[] {
			return [];
		}

		visitDictionaryMember(mem: www.webidl.model.DictionaryMember): model.Statement[] {
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
}

namespace test {

}
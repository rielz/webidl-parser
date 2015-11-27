"use strict";

namespace www.webidl {
	
	const COMMON_ARRAYBUFFERVIEW = "typedef (Int8Array or Int16Array or Int32Array or Uint8Array or Uint16Array or Uint32Array or Uint8ClampedArray or Float32Array or Float64Array or DataView) ArrayBufferView;";
	const COMMON_BUFFERSOURCE = "typedef (ArrayBufferView or ArrayBuffer) BufferSource;";
	const COMMON_DOMTIMESTAMP = "typedef unsigned long long DOMTimeStamp;";
	const COMMON_FUNCTION = "callback Function = any (any... arguments);";
	const COMMON_VOIDFUNCTION = "callback VoidFunction = void ();";
	export const COMMON = COMMON_ARRAYBUFFERVIEW + COMMON_BUFFERSOURCE + COMMON_DOMTIMESTAMP /*+ COMMON_FUNCTION + COMMON_VOIDFUNCTION*/;
	
	export interface ISyntaxVisitor<T> {
		visitExtendedAttribute?(attr: model.ExtendedAttribute): T;
		visitExtendedAttributeArgList?(attr: model.ExtendedAttributeArgList): T;
		visitExtendedAttributeIdent?(attr: model.ExtendedAttributeIdent): T;
		visitExtendedAttributeIdentList?(attr: model.ExtendedAttributeIdentList): T;
		visitExtendedAttributeNamedArgList?(attr: model.ExtendedAttributeNamedArgList): T;
		visitCallbackDefinition?(def: model.CallbackDefinition): T;
		visitInterfaceDefinition?(def: model.InterfaceDefinition): T;
		visitDictionaryDefinition?(def: model.DictionaryDefinition): T;
		visitEnumDefinition?(def: model.EnumDefinition): T;
		visitTypedef?(def: model.Typedef): T;
		visitImplementsStatement?(def: model.ImplementsStatement): T;
		visitConstMember?(mem: model.ConstMember): T;
		visitAttributeMember?(mem: model.AttributeMember): T;
		visitOperationMember?(mem: model.OperationMember): T;
		visitArgument?(arg: model.Argument): T;
		visitStaticMember?(mem: model.StaticMember): T;
		visitIterableMember?(mem: model.IterableMember): T;
		visitMaplikeMember?(mem: model.MaplikeMember): T;
		visitSetlikeMember?(mem: model.SetlikeMember): T;
		visitDictionaryMember?(mem: model.DictionaryMember): T;
		visitSimpleType?(type: model.SimpleType): T;
		visitNullableType?(type: model.NullableType): T;
		visitSequenceType?(type: model.SequenceType): T;
		visitFrozenArrayType?(type: model.FrozenArrayType): T;
		visitPromiseType?(type: model.PromiseType): T;
		visitUnionType?(type: model.UnionType): T;
		visitFloatType?(type: model.FloatType): T;
		visitIntegerType?(type: model.IntegerType): T;
		visitSimpleValue?(value: model.SimpleValue): T;
	}

	export interface ISyntax {
		accept<T>(visitor: ISyntaxVisitor<T>): T;
	}

	export interface ISymbol {
		identifier: TextSpan;
	}

	export function lookup<T extends ISymbol>(options: T[], identifier: string): T {
		return options.find((o) => {
			return o.identifier.text === identifier;
		});
	}

	export function lookupMany<T extends ISymbol>(options: T[], identifier: string): T[] {
		return options.filter((o) => {
			return o.identifier.text === identifier;
		});
	}

	export namespace model {
		export class ExtendedAttribute implements ISyntax, ISymbol {
			identifier: TextSpan

			constructor(identifier: TextSpan) {
				this.identifier = identifier;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitExtendedAttribute(this);
			}
		}

		export class ExtendedAttributeArgList extends ExtendedAttribute {
			args: Argument[];

			constructor(identifier: TextSpan, args: Argument[]) {
				super(identifier);
				this.args = args;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitExtendedAttributeArgList(this);
			}
		}

		export class ExtendedAttributeIdent extends ExtendedAttribute {
			ident: TextSpan;

			constructor(identifier: TextSpan, ident: TextSpan) {
				super(identifier);
				this.ident = ident;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitExtendedAttributeIdent(this);
			}
		}

		export class ExtendedAttributeIdentList extends ExtendedAttribute {
			idents: TextSpan[];

			constructor(identifier: TextSpan, idents: TextSpan[]) {
				super(identifier);
				this.idents = idents;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitExtendedAttributeIdentList(this);
			}
		}

		export class ExtendedAttributeNamedArgList extends ExtendedAttribute {
			ident: TextSpan;
			args: Argument[];

			constructor(identifier: TextSpan, ident: TextSpan, args: Argument[]) {
				super(identifier);
				this.ident = ident;
				this.args = args;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitExtendedAttributeNamedArgList(this);
			}
		}

		export abstract class Definition implements ISyntax, ISymbol {
			attributes: ExtendedAttribute[];
			identifier: TextSpan;

			constructor(identifier: TextSpan) {
				this.identifier = identifier;
			}

			abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
		}

		export class CallbackDefinition extends Definition {
			constructor(identifier: TextSpan) {
				super(identifier);
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitCallbackDefinition(this);
			}
		}

		export class InterfaceDefinition extends Definition {
			inheritance: TextSpan;
			members: InterfaceMember[];

			constructor(identifier: TextSpan, inheritance: TextSpan, members: InterfaceMember[]) {
				super(identifier);
				this.inheritance = inheritance;
				this.members = members;
			}

			getConstructors(): ExtendedAttribute[] {
				return lookupMany(this.attributes, "Constructor").concat(lookupMany(this.attributes, "NamedConstructor"));
			}

			isGlobal(): boolean {
				return !!lookup(this.attributes, "Global");
			}

			isPrimaryGlobal(): boolean {
				return !!lookup(this.attributes, "PrimaryGlobal");
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitInterfaceDefinition(this);
			}
		}

		export class DictionaryDefinition extends Definition {
			inheritance: TextSpan;
			members: DictionaryMember[];

			constructor(identifier: TextSpan, inheritance: TextSpan, members: DictionaryMember[]) {
				super(identifier);
				this.inheritance = inheritance;
				this.members = members;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitDictionaryDefinition(this);
			}
		}

		export class EnumDefinition extends Definition {
			values: TextSpan[];

			constructor(identifier: TextSpan, values: TextSpan[]) {
				super(identifier);
				this.values = values;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitEnumDefinition(this);
			}
		}

		export class Typedef extends Definition {
			type: Type;

			constructor(identifier: TextSpan, type: Type) {
				super(identifier);
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitTypedef(this);
			}
		}

		export class ImplementsStatement extends Definition {
			name: TextSpan;

			constructor(identifier: TextSpan, name: TextSpan) {
				super(identifier);
				this.name = name;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitImplementsStatement(this);
			}
		}

		export abstract class InterfaceMember implements ISyntax {
			attributes: ExtendedAttribute[];
			identifier: TextSpan;

			constructor(identifier: TextSpan) {
				this.identifier = identifier;
			}

			abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
		}

		export class ConstMember extends InterfaceMember {
			type: Type;
			value: Value;

			constructor(identifier: TextSpan, type: Type, value: Value) {
				super(identifier);
				this.type = type;
				this.value = value;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitConstMember(this);
			}
		}

		export class AttributeMember extends InterfaceMember {
			inherit: boolean;
			readonly: boolean;
			type: Type;

			constructor(identifier: TextSpan, inherit: boolean, readonly: boolean, type: Type) {
				super(identifier);
				this.inherit = inherit;
				this.readonly = readonly;
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitAttributeMember(this);
			}
		}

		export class OperationMember extends InterfaceMember {
			specials: TextSpan[];
			rtype: Type;
			args: Argument[];

			constructor(identifier: TextSpan, specials: TextSpan[], rtype: Type, args: Argument[]) {
				super(identifier);
				this.specials = specials;
				this.rtype = rtype;
				this.args = args;
			}

			protected hasSpecial(value: string): boolean {
				return this.specials.findIndex((s) => s.text === value) >= 0;
			}

			get isGetter(): boolean {
				return this.hasSpecial("getter");
			}

			get isSetter(): boolean {
				return this.hasSpecial("setter");
			}

			get isDeleter(): boolean {
				return this.hasSpecial("deleter");
			}

			get isLegacyCaller(): boolean {
				return this.hasSpecial("legacycaller");
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitOperationMember(this);
			}
		}

		export class Argument implements ISyntax, ISymbol {
			attributes: ExtendedAttribute[];
			optional: boolean;
			type: Type;
			variadic: boolean; // TODO: Name?
			identifier: TextSpan;
			def: Value;

			constructor(optional: boolean, type: Type, variadic: boolean, identifier: TextSpan, def: Value) {
				this.optional = optional;
				this.type = type;
				this.variadic = variadic;
				this.identifier = identifier;
				this.def = def;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitArgument(this);
			}
		}

		export class StaticMember extends InterfaceMember {
			member: InterfaceMember;

			constructor(member: InterfaceMember) {
				super(member.identifier);
				this.member = member;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitStaticMember(this);
			}
		}

		export class IterableMember extends InterfaceMember {
			key: Type;
			value: Type;

			constructor(key: Type, value: Type) {
				super(null);
				this.key = key;
				this.value = value;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitIterableMember(this);
			}
		}

		export class MaplikeMember extends InterfaceMember {
			readonly: boolean;
			key: Type;
			value: Type;

			constructor(readonly: boolean, key: Type, value: Type) {
				super(null);
				this.readonly = readonly;
				this.key = key;
				this.value = value;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitMaplikeMember(this);
			}
		}

		export class SetlikeMember extends InterfaceMember {
			readonly: boolean;
			value: Type;

			constructor(readonly: boolean, value: Type) {
				super(null);
				this.readonly = readonly;
				this.value = value;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitSetlikeMember(this);
			}
		}

		export class DictionaryMember implements ISyntax {
			attributes: ExtendedAttribute[];
			required: boolean;
			type: Type;
			identifier: TextSpan;
			def: Value;

			constructor(required: boolean, type: Type, identifier: TextSpan, def: Value) {
				this.required = required;
				this.type = type;
				this.identifier = identifier;
				this.def = def;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitDictionaryMember(this);
			}
		}

		export abstract class Type implements ISyntax {
			abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
		}

		export type TypeMapping = (type: Type) => Type;

		export class SimpleType extends Type {
			span: TextSpan;

			constructor(span: TextSpan) {
				super();
				this.span = span;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitSimpleType(this);
			}
		}

		export class NullableType extends Type {
			type: Type;

			constructor(type: Type) {
				super();
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitNullableType(this);
			}
		}

		export class SequenceType extends Type {
			type: Type;

			constructor(type: Type) {
				super();
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitSequenceType(this);
			}
		}

		export class FrozenArrayType extends Type {
			type: Type;

			constructor(type: Type) {
				super();
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitFrozenArrayType(this);
			}
		}

		export class PromiseType extends Type {
			type: Type;

			constructor(type: Type) {
				super();
				this.type = type;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitPromiseType(this);
			}
		}

		export class UnionType extends Type {
			types: Type[];

			constructor(types: Type[]) {
				super();
				this.types = types;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitUnionType(this);
			}
		}

		export class FloatType extends Type {
			unrestricted: boolean;
			name: TextSpan;

			get isFloat(): boolean {
				return this.name.text === "float";
			}

			get isDouble(): boolean {
				return this.name.text === "double";
			}

			constructor(unrestricted: boolean, name: TextSpan) {
				super();
				this.unrestricted = unrestricted;
				this.name = name;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitFloatType(this);
			}
		}

		export class IntegerType extends Type {
			unsigned: boolean;
			name: TextSpan;
			long: boolean;

			get isShort(): boolean {
				return this.name.text === "short";
			}

			get isLong(): boolean {
				return this.name.text === "long" && !this.long;
			}

			get isLongLong(): boolean {
				return this.name.text === "long" && this.long;
			}

			constructor(unsigned: boolean, name: TextSpan, long: boolean) {
				super();
				this.unsigned = unsigned;
				this.name = name;
				this.long = long;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitIntegerType(this);
			}
		}

		export abstract class Value implements ISyntax {
			abstract accept<T>(visitor: ISyntaxVisitor<T>): T;
		}

		export class SimpleValue extends Value {
			span: TextSpan;

			constructor(span: TextSpan) {
				super();
				this.span = span;
			}

			accept<T>(visitor: ISyntaxVisitor<T>): T {
				return visitor.visitSimpleValue(this);
			}
		}
	}

	export namespace grammar {
		function other(value: string): IParser<TextSpan> {
			return token(TokenKind.other, value);
		}

		function keyword(value: string): IParser<TextSpan> {
			return token(TokenKind.keyword, value);
		}

		function identifier(): IParser<TextSpan> {
			return token(TokenKind.identifier);
		}

		function id<T>(v: T): T {
			return v;
		}

		function apply<T1, T2>(p1: IParser<T1>, p2: IParser<(r: T1) => T2>): IParser<T2> {
			return map(combine(p1, p2), (args) => {
				let [r, f] = args;
				return f(r);
			});
		}

		function instance<T>(parser: IParser<TextSpan>, type: { new (span: TextSpan): T }): IParser<T> {
			return map(parser, (span) => new type(span));
		}

		export function Definitions(): IParser<model.Definition[]> {
			return optional(create<model.Definition[]>(function* () {
				let attributes = yield ExtendedAttributeList();
				let definition = yield Definition();
				let rest = yield Definitions();

				definition.attributes = attributes;
				return [definition].concat(rest);
			}), []);
		}

		export function Definition(): IParser<model.Definition> {
			return choose(CallbackOrInterface(), Partial(), Dictionary(), Enum(), Typedef(), ImplementsStatement());
		}

		export function CallbackOrInterface(): IParser<model.Definition> {
			return choose(Interface());
		}

		export function CallbackRestOrInterface(): IParser<model.Definition> {
			return fail<any>();
		}

		export function Interface(): IParser<model.InterfaceDefinition> {
			return create<model.InterfaceDefinition>(function* () {
				yield keyword("interface");
				let id = yield identifier();
				let inheritance = yield Inheritance();
				yield other("{");
				let members = yield InterfaceMembers();
				yield other("}");
				yield other(";");

				return new model.InterfaceDefinition(id, inheritance, members);
			});
		}

		export function Partial(): IParser<model.Definition> {
			return fail<any>();
		}

		export function PartialDefinition(): IParser<any> {
			return fail<any>();
		}

		export function PartialInterface(): IParser<any> {
			return fail<any>();
		}

		export function InterfaceMembers(): IParser<model.InterfaceMember[]> {
			return optional(create<model.InterfaceMember[]>(function* () {
				let attributes = yield ExtendedAttributeList();
				let member = yield InterfaceMember();
				let rest = yield InterfaceMembers();

				member.attributes = attributes;
				return [member].concat(rest);
			}), []);
		}

		export function InterfaceMember(): IParser<model.InterfaceMember> {
			return choose(Const(), Operation(), Serializer(), Stringifier(), StaticMember(), Iterable(), ReadonlyMember(), ReadWriteAttribute(), ReadWriteMaplike(), ReadWriteSetlike());
		}

		export function Dictionary(): IParser<model.DictionaryDefinition> {
			return create<model.DictionaryDefinition>(function* () {
				yield keyword("dictionary");
				let id = yield identifier();
				let inheritance = yield Inheritance();
				yield other("{");
				let members = yield DictionaryMembers();
				yield other("}");
				yield other(";");

				return new model.DictionaryDefinition(id, inheritance, members);
			});
		}

		export function DictionaryMembers(): IParser<model.DictionaryMember[]> {
			return optional(create<model.DictionaryMember[]>(function* () {
				let attributes = yield ExtendedAttributeList();
				let member = yield DictionaryMember();
				let members = yield DictionaryMembers();

				member.attributes = attributes;
				return [member].concat(members);
			}), []);
		}

		export function DictionaryMember(): IParser<model.DictionaryMember> {
			return create<model.DictionaryMember>(function* () {
				let required = yield Required();
				let type = yield Type();
				let id = yield identifier();
				let def = yield Default();
				yield other(";");

				return new model.DictionaryMember(required, type, id, def);
			});
		}

		export function Required(): IParser<boolean> {
			return exists(keyword("required"));
		}

		export function PartialDictionary(): IParser<any> {
			return fail<any>();
		}

		export function Default(): IParser<model.Value> {
			return optional(create<model.Value>(function* () {
				yield other("=");
				return yield DefaultValue();
			}));
		}

		export function DefaultValue(): IParser<any> {
			return choose(
				ConstValue(),
				instance(token(TokenKind.string), model.SimpleValue),
				create<model.SimpleValue>(function* () {
					let begin = yield other("[");
					let end = yield other("]");
					return new model.SimpleValue({ text: "[]", position: begin.position });
				})
			);
		}

		export function Inheritance(): IParser<any> {
			return optional(create<TextSpan>(function* () {
				yield other(":");
				return yield identifier();
			}), null);
		}

		export function Enum(): IParser<model.EnumDefinition> {
			return create<model.EnumDefinition>(function* () {
				yield keyword("enum");
				let id = yield identifier();
				yield other("{");
				let values = yield EnumValueList();
				yield other("}");
				yield other(";");

				return new model.EnumDefinition(id, values);
			});
		}

		export function EnumValueList(): IParser<TextSpan[]> {
			return create<TextSpan[]>(function* () {
				let first = yield token(TokenKind.string);
				let rest = yield EnumValueListComma();

				return [first].concat(rest);
			});
		}

		export function EnumValueListComma(): IParser<TextSpan[]> {
			return optional(create<TextSpan[]>(function* () {
				yield other(",");
				return yield EnumValueListString();
			}), []);
		}

		export function EnumValueListString(): IParser<TextSpan[]> {
			return optional(create<TextSpan[]>(function* () {
				let first = yield token(TokenKind.string);
				let rest = yield EnumValueListComma();

				return [first].concat(rest);
			}), []);
		}

		export function CallbackRest(): IParser<any> {
			return fail<any>();
		}

		export function Typedef(): IParser<model.Typedef> {
			return create<model.Typedef>(function* () {
				yield keyword("typedef");
				let type = yield Type();
				let id = yield identifier();
				yield other(";");

				return new model.Typedef(id, type);
			});
		}

		export function ImplementsStatement(): IParser<model.ImplementsStatement> {
			return create<model.ImplementsStatement>(function* () {
				let id = yield identifier();
				yield keyword("implements");
				let name = yield identifier();
				yield other(";");

				return new model.ImplementsStatement(id, name);
			});
		}

		export function Const(): IParser<model.ConstMember> {
			return create<model.ConstMember>(function* () {
				yield keyword("const");
				let type = yield ConstType();
				let id = yield identifier();
				yield other("=");
				let value = yield ConstValue();
				yield other(";");

				return new model.ConstMember(id, type, value);
			});
		}

		export function ConstValue(): IParser<model.SimpleValue> {
			return choose(
				BooleanLiteral(),
				FloatLiteral(),
				instance(token(TokenKind.integer), model.SimpleValue),
				instance(keyword("null"), model.SimpleValue)
			);
		}

		export function BooleanLiteral(): IParser<model.SimpleValue> {
			return instance(choose(keyword("true"), keyword("false")), model.SimpleValue);
		}

		export function FloatLiteral(): IParser<model.SimpleValue> {
			return instance(choose(token(TokenKind.float), keyword("-Infinity"), keyword("Infinity"), keyword("NaN")), model.SimpleValue);
		}

		export function Serializer(): IParser<any> {
			return fail<any>();
		}

		export function SerializerRest(): IParser<any> {
			return fail<any>();
		}

		function SerializationPattern(): IParser<any> {
			return fail<any>();
		}

		function SerializationPatternMap(): IParser<any> {
			return fail<any>();
		}

		function SerializationPatternList(): IParser<any> {
			return fail<any>();
		}

		export function Stringifier(): IParser<any> {
			return fail<any>();
		}

		export function StringifierRest(): IParser<any> {
			return fail<any>();
		}

		export function StaticMember(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				yield keyword("static");
				let member = yield StaticMemberRest();

				return new model.StaticMember(member);
			});
		}

		export function StaticMemberRest(): IParser<model.InterfaceMember> {
			return choose(create<model.InterfaceMember>(function* () {
				let readonly = yield ReadOnly();
				let rest = yield AttributeRest();

				rest.readonly = readonly;
				return rest;
			}), create<model.InterfaceMember>(function* () {
				let rtype = yield ReturnType();
				let rest = yield OperationRest();

				rest.rtype = rtype;
				return rest;
			}));
		}

		export function ReadonlyMember(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				yield keyword("readonly");
				let rest = yield ReadonlyMemberRest();

				rest.readonly = true;
				return rest;
			});
		}

		export function ReadonlyMemberRest(): IParser<model.InterfaceMember> {
			return choose(AttributeRest(), ReadWriteMaplike(), ReadWriteSetlike());
		}

		export function ReadWriteAttribute(): IParser<model.AttributeMember> {
			return choose(create<model.AttributeMember>(function* () {
				yield keyword("inherit");
				let readonly = yield ReadOnly();
				let rest = yield AttributeRest();

				rest.inherit = true;
				rest.readonly = readonly;
				return rest;
			}), AttributeRest());
		}

		export function AttributeRest(): IParser<model.AttributeMember> {
			return create<model.AttributeMember>(function* () {
				yield keyword("attribute");
				let type = yield Type();
				let name = yield AttributeName();
				yield other(";");

				return new model.AttributeMember(name, false, false, type);
			})
		}

		export function AttributeName(): IParser<TextSpan> {
			return choose(AttributeNameKeyword(), identifier());
		}

		export function AttributeNameKeyword(): IParser<TextSpan> {
			return keyword("required");
		}

		export function Inherit(): IParser<boolean> {
			return exists(keyword("inherit"));
		}

		export function ReadOnly(): IParser<boolean> {
			return exists(keyword("readonly"));
		}

		export function Operation(): IParser<model.InterfaceMember> {
			return choose(create<model.InterfaceMember>(function* () {
				let rtype = yield ReturnType();
				let rest = yield OperationRest();

				rest.specials = [];
				rest.rtype = rtype;
				return rest;
			}), SpecialOperation());
		}

		export function SpecialOperation(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				let special = yield Special();
				let specials = yield Specials();
				let rtype = yield ReturnType();
				let rest = yield OperationRest();

				rest.specials = [special].concat(specials);
				rest.rtype = rtype;
				return rest;
			});
		}

		export function Specials(): IParser<TextSpan[]> {
			return many(Special());
		}

		export function Special(): IParser<TextSpan> {
			return choose(keyword("getter"), keyword("setter"), keyword("deleter"), keyword("legacycaller"));
		}

		export function OperationRest(): IParser<model.OperationMember> {
			return create<model.OperationMember>(function* () {
				let id = yield OptionalIdentifier();
				yield other("(");
				let args = yield ArgumentList();
				yield other(")");
				yield other(";");

				return new model.OperationMember(id, [], null, args);
			})
		}

		export function OptionalIdentifier(): IParser<TextSpan> {
			return optional(identifier(), null);
		}

		export function ArgumentList(): IParser<model.Argument[]> {
			return optional(create<model.Argument[]>(function* () {
				let arg = yield Argument();
				let args = yield Arguments();

				return [arg].concat(args);
			}), []);
		}

		export function Arguments(): IParser<model.Argument[]> {
			return optional(create<model.Argument[]>(function* () {
				yield other(",");
				let arg = yield Argument();
				let args = yield Arguments();

				return [arg].concat(args);
			}), []);
		}

		export function Argument(): IParser<model.Argument> {
			return create<model.Argument>(function* () {
				let attributes = yield ExtendedAttributeList();
				let arg = yield OptionalOrRequiredArgument();

				arg.attributes = attributes;
				return arg;
			});
		}

		export function OptionalOrRequiredArgument(): IParser<model.Argument> {
			return choose(create<model.Argument>(function* () {
				yield keyword("optional");
				let type = yield Type();
				let name = yield ArgumentName();
				let def = yield Default();

				return new model.Argument(true, type, false, name, def);
			}), create<model.Argument>(function* () {
				let type = yield Type();
				let variadic = yield Ellipsis();
				let name = yield ArgumentName();

				return new model.Argument(false, type, variadic, name, null);
			}));
		}


		function ArgumentName(): IParser<TextSpan> {
			return choose(ArgumentNameKeyword(), identifier());
		}

		function Ellipsis(): IParser<boolean> {
			return exists(keyword("..."));
		}

		function Iterable(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				yield keyword("iterable");
				yield other("<");
				let key = yield Type();
				let value = yield OptionalType();
				yield other(">");
				yield other(";");

				if (value) {
					return new model.IterableMember(key, value);
				} else {
					return new model.IterableMember(null, key);
				}
			});
		}

		function OptionalType(): IParser<model.Type> {
			return optional(create<model.Type>(function* () {
				yield other(",");
				return yield Type();
			}));
		}

		function ReadWriteMaplike(): IParser<model.InterfaceMember> {
			return MaplikeRest();
		}

		function ReadWriteSetlike(): IParser<model.InterfaceMember> {
			return SetlikeRest();
		}

		function MaplikeRest(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				yield keyword("maplike");
				yield other("<");
				let key = yield Type();
				yield other(",");
				let value = yield Type();
				yield other(">");
				yield other(";");

				return new model.MaplikeMember(false, key, value);
			});
		}

		function SetlikeRest(): IParser<model.InterfaceMember> {
			return create<model.InterfaceMember>(function* () {
				yield keyword("setlike");
				yield other("<");
				let value = yield Type();
				yield other(">");
				yield other(";");

				return new model.SetlikeMember(false, value);
			});
		}

		export function ExtendedAttributeList(): IParser<model.ExtendedAttribute[]> {
			return optional(create<model.ExtendedAttribute[]>(function* () {
				yield other("[");
				let attribute = yield ExtendedAttribute();
				let attributes = yield ExtendedAttributes();
				yield other("]");

				return [attribute].concat(attributes);
			}), []);
		}

		function ExtendedAttributes(): IParser<model.ExtendedAttribute[]> {
			return optional(create<model.ExtendedAttribute[]>(function* () {
				yield other(",");
				let attribute = yield ExtendedAttribute();
				let attributes = yield ExtendedAttributes();

				return [attribute].concat(attributes);
			}), []);
		}

		function ExtendedAttribute(): IParser<model.ExtendedAttribute> {
			// Order is relevant:
			return choose_backtracking(ExtendedAttributeNamedArgList(), ExtendedAttributeIdentList(), ExtendedAttributeIdent(), ExtendedAttributeArgList(), ExtendedAttributeNoArgs());
		}

		function ExtendedAttributeRest(): IParser<any> {
			return fail<any>();
		}

		function ExtendedAttributeInner(): IParser<any> {
			return fail<any>();
		}

		function Other(): IParser<TextSpan> {
			return fail<any>();
		}

		function ArgumentNameKeyword(): IParser<TextSpan> {
			const keywords = [
				"attribute", "callback", "const", "deleter",
				"dictioanry", "enum", "getter", "implements",
				"inherit", "interface", "iterable", "legacycaller",
				"maplike", "partial", "required", "serializer",
				"setlike", "setter", "static", "stringifier",
				"typedef", "unrestricted"
			];

			let parsers = keywords.map(keyword);
			return choose<TextSpan>(...parsers);
		}

		function OtherOrComma(): IParser<any> {
			return fail<any>();
		}

		function Type(): IParser<model.Type> {
			return choose(SingleType(), apply(UnionType(), Null()));
		}

		function SingleType(): IParser<model.Type> {
			return choose(NonAnyType(), instance(keyword("any"), model.SimpleType));
		}

		function UnionType(): IParser<model.UnionType> {
			return create<model.UnionType>(function* () {
				yield other("(");
				let fst = yield UnionMemberType();
				yield keyword("or");
				let snd = yield UnionMemberType();
				let rest = yield UnionMemberTypes();
				yield other(")");

				return new model.UnionType([fst, snd].concat(rest));
			});
		}

		function UnionMemberType(): IParser<model.Type> {
			return choose(
				NonAnyType(),
				apply(UnionType(), Null())
			);
		}

		function UnionMemberTypes(): IParser<model.Type[]> {
			return optional(create<model.Type[]>(function* () {
				yield keyword("or");
				let type = yield UnionMemberType();
				let rest = yield UnionMemberTypes();

				return [type].concat(rest);
			}), []);
		}

		function NonAnyType(): IParser<model.Type> {
			const sequence = create<model.SequenceType>(function* () {
				yield keyword("sequence");
				yield other("<");
				let type = yield Type();
				yield other(">");

				return new model.SequenceType(type);
			});

			const frozen = create<model.FrozenArrayType>(function* () {
				yield keyword("FrozenArray");
				yield other("<");
				let type = yield Type();
				yield other(">");

				return new model.FrozenArrayType(type);
			});

			return choose(
				apply(PrimitiveType(), Null()),
				apply(PromiseType(), Null()),
				apply(instance(keyword("ByteString"), model.SimpleType), Null()),
				apply(instance(keyword("DOMString"), model.SimpleType), Null()),
				apply(instance(keyword("USVString"), model.SimpleType), Null()),
				apply(instance(identifier(), model.SimpleType), Null()),
				apply(sequence, Null()),
				apply(instance(keyword("object"), model.SimpleType), Null()),
				apply(instance(keyword("RegExp"), model.SimpleType), Null()),
				apply(instance(keyword("Error"), model.SimpleType), Null()),
				apply(instance(keyword("DOMException"), model.SimpleType), Null()),
				apply(BufferRelatedType(), Null()),
				apply(frozen, Null())
			);
		}

		function BufferRelatedType(): IParser<model.Type> {
			const keywords = [
				"ArrayBuffer", "DataView", "Int8Array",
				"Int16Array", "Int32Array", "Uint8Array",
				"Uint16Array", "Uint32Array", "Uint8ClampedArray",
				"Float32Array", "Float64Array"
			];

			return instance(choose(...keywords.map(keyword)), model.SimpleType);
		}

		function ConstType(): IParser<model.Type> {
			const type = choose(PrimitiveType(), instance(identifier(), model.SimpleType));
			return apply(type, Null());
		}

		function PrimitiveType(): IParser<model.Type> {
			return choose(
				UnsignedIntegerType(),
				UnrestrictedFloatType(),
				instance(keyword("boolean"), model.SimpleType),
				instance(keyword("byte"), model.SimpleType),
				instance(keyword("octet"), model.SimpleType)
			);
		}

		function UnrestrictedFloatType(): IParser<model.Type> {
			return choose(create<model.FloatType>(function* () {
				yield keyword("unrestricted");
				let type = yield FloatType();

				type.unrestricted = true;
				return type;
			}), FloatType());
		}

		function FloatType(): IParser<model.FloatType> {
			return create<model.FloatType>(function* () {
				let name = yield choose(keyword("float"), keyword("double"));
				return new model.FloatType(false, name);
			})
		}

		function UnsignedIntegerType(): IParser<model.Type> {
			return choose(create<model.IntegerType>(function* () {
				yield keyword("unsigned");
				let type = yield IntegerType();

				type.unsigned = true;
				return type;
			}), IntegerType());
		}

		function IntegerType(): IParser<model.IntegerType> {
			return choose(create<model.IntegerType>(function* () {
				let name = yield keyword("short");
				return new model.IntegerType(false, name, false);
			}), create<model.IntegerType>(function* () {
				let name = yield keyword("long");
				let long = yield OptionalLong();
				return new model.IntegerType(false, name, long);
			}));
		}

		function OptionalLong(): IParser<boolean> {
			return exists(keyword("long"));
		}

		function PromiseType(): IParser<model.Type> {
			return create<model.Type>(function* () {
				yield keyword("Promise");
				yield other("<");
				let type = yield Type();
				yield other(">");

				return new model.PromiseType(type);
			});
		}

		function Null(): IParser<model.TypeMapping> {
			let questionmark = map(other("?"), function(_): model.TypeMapping {
				return (t: model.Type) => new model.NullableType(t);
			});

			return optional(questionmark, id);
		}

		function ReturnType(): IParser<model.Type> {
			return choose(Type(), map(keyword("void"), (_) => null));
		}

		function IdentifierList(): IParser<TextSpan[]> {
			return create<TextSpan[]>(function* () {
				let head = yield identifier();
				let tail = yield Identifiers();

				return [head].concat(tail);
			});
		}

		function Identifiers(): IParser<TextSpan[]> {
			return optional(create<TextSpan[]>(function* () {
				yield other(",");
				let head = yield identifier();
				let tail = yield Identifiers();

				return [head].concat(tail);
			}), []);
		}

		function ExtendedAttributeNoArgs(): IParser<model.ExtendedAttribute> {
			return instance(identifier(), model.ExtendedAttribute);
		}

		function ExtendedAttributeArgList(): IParser<model.ExtendedAttributeArgList> {
			return create<model.ExtendedAttributeArgList>(function* () {
				let id = yield identifier();
				yield other("(");
				let args = yield ArgumentList();
				yield other(")");

				return new model.ExtendedAttributeArgList(id, args);
			});
		}

		function ExtendedAttributeIdent(): IParser<model.ExtendedAttributeIdent> {
			return create<model.ExtendedAttributeIdent>(function* () {
				let id = yield identifier();
				yield other("=");
				let ident = yield identifier();

				return new model.ExtendedAttributeArgList(id, ident);
			});
		}

		function ExtendedAttributeIdentList(): IParser<model.ExtendedAttributeIdentList> {
			return create<model.ExtendedAttributeIdentList>(function* () {
				let id = yield identifier();
				yield other("=");
				yield other("(");
				let idents = yield IdentifierList();
				yield other(")");

				return new model.ExtendedAttributeIdentList(id, idents);
			});
		}

		function ExtendedAttributeNamedArgList(): IParser<model.ExtendedAttributeNamedArgList> {
			return create<model.ExtendedAttributeNamedArgList>(function* () {
				let id = yield identifier();
				yield other("=");
				let ident = yield identifier();
				yield other("(");
				let args = yield ArgumentList();
				yield other(")");

				return new model.ExtendedAttributeNamedArgList(id, ident, args);
			});
		}
	}

	namespace semantic {

	}
}
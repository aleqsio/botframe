import { bagOf, listOf } from "./bag";

export const VARIABLE_TYPES = ["color", "length", "number", "text", "boolean", "choice"] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

export type Literal = string | number | boolean;

export interface Reference {
	var: string;
}

export type VariableValue = Literal | Reference;

export interface Variable {
	id: string;
	name: string;
	type: VariableType;
	initial: VariableValue;
	options: readonly string[];
	prop: boolean;
}

export type Assignments = Readonly<Record<string, VariableValue>>;

export const DOCUMENT_SCOPE = "document";

function isVariableType(value: unknown): value is VariableType {
	return VARIABLE_TYPES.some((type) => type === value);
}

export function isReference(value: VariableValue): value is Reference {
	return typeof value === "object";
}

function isLiteral(value: unknown): value is Literal {
	const kind = typeof value;
	return kind === "string" || kind === "boolean" || (kind === "number" && Number.isFinite(value));
}

export function valueOf(value: unknown): VariableValue | null {
	if (isLiteral(value)) {
		return value;
	}
	const held = bagOf(value)["var"];
	return typeof held === "string" && held !== "" ? { var: held } : null;
}

const LITERAL_KIND: Readonly<Record<VariableType, "string" | "number" | "boolean">> = {
	color: "string",
	length: "number",
	number: "number",
	text: "string",
	boolean: "boolean",
	choice: "string",
};

export function fitsType(type: VariableType, options: readonly string[], value: Literal): boolean {
	if (typeof value !== LITERAL_KIND[type]) {
		return false;
	}
	return type !== "choice" || (typeof value === "string" && options.includes(value));
}

export function emptyValue(type: VariableType, options: readonly string[]): Literal {
	const empty: Readonly<Record<VariableType, Literal>> = {
		color: "#000000",
		length: 0,
		number: 0,
		text: "",
		boolean: false,
		choice: options[0] ?? "",
	};
	return empty[type];
}

function optionsOf(value: unknown): readonly string[] {
	const texts = listOf(value).filter((item) => typeof item === "string");
	return [...new Set(texts)];
}

function heldInitial(
	type: VariableType,
	options: readonly string[],
	value: unknown,
): VariableValue {
	const held = valueOf(value);
	if (held !== null && (isReference(held) || fitsType(type, options, held))) {
		return held;
	}
	return emptyValue(type, options);
}

export function variableOf(id: string, value: unknown): Variable | null {
	const bag = bagOf(value);
	const { name, type } = bag;
	if (typeof name !== "string" || !isVariableType(type)) {
		return null;
	}
	const options = type === "choice" ? optionsOf(bag["options"]) : [];
	if (type === "choice" && options.length === 0) {
		return null;
	}
	const initial = heldInitial(type, options, bag["initial"]);
	return { id, name, type, initial, options, prop: bag["prop"] === true };
}

export function newVariableId(): string {
	return crypto.randomUUID();
}

import { bagOf, listOf } from "./bag";
import { isLiteral, storedValue, valueOf } from "./value";
import type { Literal, VariableValue } from "./value";

export const VARIABLE_TYPES = ["color", "length", "number", "text", "boolean", "choice"] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

export interface Variable {
	id: string;
	name: string;
	type: VariableType;
	initial: VariableValue;
	options: readonly string[];
}

export type Assignments = Readonly<Record<string, VariableValue>>;

export const DOCUMENT_SCOPE = "document";

function isVariableType(value: unknown): value is VariableType {
	return VARIABLE_TYPES.some((type) => type === value);
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
	if (held !== null && (!isLiteral(held) || fitsType(type, options, held))) {
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
	return { id, name, type, initial: heldInitial(type, options, bag["initial"]), options };
}

export function storedVariable(variable: Variable): Record<string, unknown> {
	const { name, type, initial, options } = variable;
	return { name, type, initial: storedValue(initial), options: [...options] };
}

export function newVariableId(): string {
	return crypto.randomUUID();
}

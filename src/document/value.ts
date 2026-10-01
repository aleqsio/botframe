import { bagOf, isList, listOf } from "./bag";

export type Literal = string | number | boolean;

export interface Reference {
	readonly var: string;
}

export type Result = Literal | Reference;

export interface Case {
	readonly test: string;
	readonly is: Literal;
	readonly result: Result;
}

export interface Condition {
	readonly when: readonly Case[];
	readonly else: Result;
}

export type VariableValue = Result | Condition;

export type Bound = Reference | Condition;

export type Remap = (variable: string) => string | null;

export function isLiteral(value: unknown): value is Literal {
	const kind = typeof value;
	return kind === "string" || kind === "boolean" || (kind === "number" && Number.isFinite(value));
}

export function isReference(value: VariableValue): value is Reference {
	return typeof value === "object" && "var" in value;
}

export function isCondition(value: VariableValue): value is Condition {
	return typeof value === "object" && "when" in value;
}

function referenceOf(value: unknown): Reference | null {
	const held = bagOf(value)["var"];
	return typeof held === "string" && held !== "" ? { var: held } : null;
}

function resultOf(value: unknown): Result | null {
	return isLiteral(value) ? value : referenceOf(value);
}

function caseOf(value: unknown): Case | null {
	const bag = bagOf(value);
	const { test, is } = bag;
	const result = resultOf(bag["result"]);
	return typeof test === "string" && test !== "" && isLiteral(is) && result !== null
		? { test, is, result }
		: null;
}

function conditionOf(value: unknown): Condition | null {
	const bag = bagOf(value);
	const otherwise = resultOf(bag["else"]);
	if (!isList(bag["when"]) || otherwise === null) {
		return null;
	}
	return { when: listOf(bag["when"]).flatMap((item) => caseOf(item) ?? []), else: otherwise };
}

export function valueOf(value: unknown): VariableValue | null {
	return resultOf(value) ?? conditionOf(value);
}

export function boundOf(value: unknown): Bound | null {
	const held = valueOf(value);
	return held === null || isLiteral(held) ? null : held;
}

function storedResult(result: Result): unknown {
	return isLiteral(result) ? result : { var: result.var };
}

export function storedValue(value: VariableValue): unknown {
	if (!isCondition(value)) {
		return storedResult(value);
	}
	return {
		when: value.when.map(({ test, is, result }) => ({ test, is, result: storedResult(result) })),
		else: storedResult(value.else),
	};
}

function remapResult(result: Result, remap: Remap): Result | null {
	if (isLiteral(result)) {
		return result;
	}
	const target = remap(result.var);
	return target === null ? null : { var: target };
}

function remapCase(held: Case, remap: Remap): Case | null {
	const test = remap(held.test);
	const result = remapResult(held.result, remap);
	return test === null || result === null ? null : { ...held, test, result };
}

export function remapValue(value: VariableValue, remap: Remap): VariableValue | null {
	if (!isCondition(value)) {
		return remapResult(value, remap);
	}
	const cases = value.when.map((held) => remapCase(held, remap));
	const otherwise = remapResult(value.else, remap);
	if (otherwise === null || cases.some((held) => held === null)) {
		return null;
	}
	return { when: cases.flatMap((held) => held ?? []), else: otherwise };
}

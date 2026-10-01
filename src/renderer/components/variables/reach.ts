import type { ComponentsView } from "../../../document/components";
import { heldValue, resolveVariable } from "../../../document/resolve";
import type { ResolveSource } from "../../../document/resolve";
import { isCondition, isLiteral, isReference } from "../../../document/value";
import type { Case, Condition, Literal, VariableValue } from "../../../document/value";
import { DOCUMENT_SCOPE, emptyValue } from "../../../document/variable";
import type { Variable, VariableType } from "../../../document/variable";

const DOCUMENT_LABEL = "Document";

export type ValueKind = "value" | "variable" | "condition";

export interface Reach {
	view: ComponentsView;
	owners: readonly string[];
	source: ResolveSource;
	chain: readonly string[];
	skip?: string | undefined;
}

export interface Nearest {
	value: Literal | null;
	held: VariableValue | null;
}

export function nearestOf(reach: Reach, id: string): Nearest {
	const { chain, source } = reach;
	return { value: resolveVariable(source, id, chain), held: heldValue(source, id, chain) };
}

export interface Group {
	owner: string;
	label: string;
	variables: readonly Variable[];
}

export function kindOf(value: VariableValue): ValueKind {
	if (isLiteral(value)) {
		return "value";
	}
	return isCondition(value) ? "condition" : "variable";
}

export function ownerLabel(view: ComponentsView, owner: string): string {
	return owner === DOCUMENT_SCOPE ? DOCUMENT_LABEL : (view.entry(owner)?.name ?? owner);
}

export function innerFirst(owners: readonly string[]): readonly string[] {
	return [...owners.filter((owner) => owner !== DOCUMENT_SCOPE), DOCUMENT_SCOPE];
}

export function groupsOf(reach: Reach, type: VariableType | null): readonly Group[] {
	const { owners, view } = reach;
	return innerFirst(owners).flatMap((owner) => {
		const variables = view
			.variables(owner)
			.filter((variable) => variable.id !== reach.skip)
			.filter((variable) => type === null || variable.type === type);
		return variables.length === 0 ? [] : [{ owner, label: ownerLabel(view, owner), variables }];
	});
}

export function nameOf(view: ComponentsView, id: string): string {
	return view.declared(id)?.variable.name ?? "missing";
}

export function literalText(value: Literal): string {
	if (typeof value === "boolean") {
		return value ? "on" : "off";
	}
	return String(value);
}

export function isColor(value: Literal): value is string {
	return typeof value === "string" && CSS.supports("color", value);
}

export function firstValue(variable: Variable | null): Literal {
	if (variable === null) {
		return "";
	}
	return variable.type === "boolean" ? true : emptyValue(variable.type, variable.options);
}

function firstTest(reach: Reach): Variable | null {
	const tests = groupsOf(reach, null).flatMap((group) => group.variables);
	const switching = tests.find((held) => held.type === "choice" || held.type === "boolean");
	return switching ?? tests[0] ?? null;
}

export function newCase(reach: Reach, current: Literal, makeTest: () => string): Case {
	const test = firstTest(reach);
	return test === null
		? { test: makeTest(), is: true, result: current }
		: { test: test.id, is: firstValue(test), result: current };
}

export function starterCondition(
	reach: Reach,
	current: Literal,
	makeTest: () => string,
): Condition {
	return { when: [newCase(reach, current, makeTest)], else: current };
}

export function slotsOf(count: number): readonly string[] {
	return Array.from({ length: count }, (_, at) => `case ${at + 1}`);
}

export function referenced(value: VariableValue): string | null {
	return !isLiteral(value) && isReference(value) ? value.var : null;
}

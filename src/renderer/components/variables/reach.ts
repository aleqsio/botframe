import type { ComponentsView } from "../../../document/components";
import { isCondition, isLiteral, isReference } from "../../../document/value";
import type { Condition, Literal, VariableValue } from "../../../document/value";
import { DOCUMENT_SCOPE, emptyValue } from "../../../document/variable";
import type { Variable, VariableType } from "../../../document/variable";

const DOCUMENT_LABEL = "Document";

export type ValueKind = "value" | "variable" | "condition";

export interface Reach {
	view: ComponentsView;
	owners: readonly string[];
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

function firstTest(reach: Reach): Variable | null {
	const tests = groupsOf(reach, null).flatMap((group) => group.variables);
	return (
		tests.find((variable) => variable.type === "choice" || variable.type === "boolean") ?? null
	);
}

export function starterCondition(reach: Reach, current: Literal): Condition {
	const test = firstTest(reach);
	if (test === null) {
		return { when: [], else: current };
	}
	const is = test.type === "boolean" ? true : emptyValue(test.type, test.options);
	return { when: [{ test: test.id, is, result: current }], else: current };
}

export function referenced(value: VariableValue): string | null {
	return !isLiteral(value) && isReference(value) ? value.var : null;
}

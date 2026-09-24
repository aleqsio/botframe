import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE, emptyValue, newVariableId } from "../../../document/variable";
import type { Variable, VariableType, VariableValue } from "../../../document/variable";

const MESSAGE = "set variable";
const FIRST_OPTIONS = ["one", "two"];

const TYPE_NAMES: Readonly<Record<VariableType, string>> = {
	color: "Color",
	length: "Length",
	number: "Number",
	text: "Text",
	boolean: "Switch",
	choice: "Choice",
};

export function typeName(type: VariableType): string {
	return TYPE_NAMES[type];
}

export function addVariable(doc: DesignDocument, owner: string, type: VariableType): void {
	const scope = doc.components.scope(owner);
	const options = type === "choice" ? FIRST_OPTIONS : [];
	const taken = scope.variables().filter((variable) => variable.type === type).length;
	scope.put({
		id: newVariableId(),
		name: `${TYPE_NAMES[type]} ${taken + 1}`,
		type,
		initial: emptyValue(type, options),
		options,
		prop: owner !== DOCUMENT_SCOPE,
	});
	doc.commit(MESSAGE);
}

export function editVariable(
	doc: DesignDocument,
	owner: string,
	variable: Variable,
	change: Partial<Omit<Variable, "id" | "type">>,
): void {
	doc.components.scope(owner).put({ ...variable, ...change });
}

export function commitVariables(doc: DesignDocument): void {
	doc.commit(MESSAGE);
}

export function optionsOf(text: string): readonly string[] {
	return [
		...new Set(
			text
				.split(",")
				.map((part) => part.trim())
				.filter((part) => part !== ""),
		),
	];
}

export function removeVariable(doc: DesignDocument, owner: string, id: string): void {
	doc.components.scope(owner).remove(id);
	doc.commit(MESSAGE);
}

export function setCell(
	doc: DesignDocument,
	owner: string,
	cell: { choice: string; option: string; variable: string },
	value: VariableValue | null,
): void {
	doc.components.scope(owner).setCell(cell, value);
}

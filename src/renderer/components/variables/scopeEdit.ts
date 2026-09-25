import type { DesignDocument } from "../../../document/document";
import { emptyValue, newVariableId } from "../../../document/variable";
import type { Variable, VariableType } from "../../../document/variable";

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

export function makeVariable(
	doc: DesignDocument,
	owner: string,
	held: Omit<Variable, "id">,
): string {
	const id = newVariableId();
	doc.components.scope(owner).put({ id, ...held });
	return id;
}

export function addVariable(doc: DesignDocument, owner: string, type: VariableType): void {
	const options = type === "choice" ? FIRST_OPTIONS : [];
	const taken = doc.components
		.scope(owner)
		.variables()
		.filter((variable) => variable.type === type).length;
	makeVariable(doc, owner, {
		name: `${TYPE_NAMES[type].toLowerCase()} ${taken + 1}`,
		type,
		initial: emptyValue(type, options),
		options,
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

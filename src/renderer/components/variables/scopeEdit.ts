import type { DesignDocument } from "../../../document/document";
import { resolveValue } from "../../../document/resolve";
import { isLiteral } from "../../../document/value";
import type { Literal } from "../../../document/value";
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

function freeName(doc: DesignDocument, owner: string, base: string): string {
	const taken = new Set(
		doc.components
			.scope(owner)
			.variables()
			.map((variable) => variable.name),
	);
	let count = 1;
	let name = base;
	while (taken.has(name)) {
		count += 1;
		name = `${base} ${count}`;
	}
	return name;
}

export function makeVariable(
	doc: DesignDocument,
	owner: string,
	held: Omit<Variable, "id">,
): string {
	const id = newVariableId();
	doc.components.scope(owner).put({ ...held, id, name: freeName(doc, owner, held.name) });
	return id;
}

export function addVariable(doc: DesignDocument, owner: string, type: VariableType): string {
	const options = type === "choice" ? FIRST_OPTIONS : [];
	const taken = doc.components
		.scope(owner)
		.variables()
		.filter((variable) => variable.type === type).length;
	const id = makeVariable(doc, owner, {
		name: `${TYPE_NAMES[type].toLowerCase()} ${taken + 1}`,
		type,
		initial: emptyValue(type, options),
		options,
	});
	doc.commit(MESSAGE);
	return id;
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

export function defaultNow(doc: DesignDocument, variable: Variable): Literal {
	const { initial, options, type } = variable;
	if (isLiteral(initial)) {
		return initial;
	}
	return resolveValue(doc.tree.resolver(), initial, []) ?? emptyValue(type, options);
}

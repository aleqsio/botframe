import type { DesignDocument } from "../../../document/document";
import type { EditableKind } from "../../../document/paint";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { makeVariable } from "../variables/scopeEdit";

const ADD_MESSAGE = "add variable";

const NEW_PAINT: Readonly<Record<EditableKind, { name: string; initial: string }>> = {
	solid: { name: "color", initial: "#d9d9d9" },
	gradient: {
		name: "gradient",
		initial: "linear-gradient(180deg, #0d99ff 0%, #8b5cf6 100%)",
	},
};

export function addPaintVariable(doc: DesignDocument, kind: EditableKind): string {
	const id = makeVariable(doc, DOCUMENT_SCOPE, { ...NEW_PAINT[kind], type: "color", options: [] });
	doc.commit(ADD_MESSAGE);
	return id;
}

export function editablePaint(variable: Variable): string | null {
	return typeof variable.initial === "string" ? variable.initial : null;
}

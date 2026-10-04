import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { addPaintVariable, editablePaint } from "./libraryActions";

function valueOf(doc: DesignDocument, id: string): unknown {
	return doc.components
		.scope(DOCUMENT_SCOPE)
		.variables()
		.find((variable) => variable.id === id)?.initial;
}

describe("addPaintVariable", () => {
	it("makes a document color that holds a solid color", () => {
		const doc = DesignDocument.create();

		expect(valueOf(doc, addPaintVariable(doc, "solid"))).toBe("#d9d9d9");
	});

	it("makes a document color that holds a gradient of two stops", () => {
		const doc = DesignDocument.create();

		expect(valueOf(doc, addPaintVariable(doc, "gradient"))).toBe(
			"linear-gradient(180deg, #0d99ff 0%, #8b5cf6 100%)",
		);
	});
});

describe("editablePaint", () => {
	const color: Variable = { id: "a", name: "red", type: "color", initial: "#ff0000", options: [] };

	it("gives the literal paint of a color", () => {
		expect(editablePaint(color)).toBe("#ff0000");
	});

	it("gives no paint for a reference or a condition, so that an edit cannot replace it", () => {
		expect(editablePaint({ ...color, initial: { var: "b" } })).toBeNull();
		expect(editablePaint({ ...color, initial: { when: [], else: "#000000" } })).toBeNull();
	});
});

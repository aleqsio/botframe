import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { firstId } from "../../../document/documentFixtures";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { addPaintVariable, bindFill, editablePaint } from "./libraryActions";

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

describe("bindFill", () => {
	it("binds the fill of each layer to the variable in one undo step", () => {
		const doc = DesignDocument.create();
		const layer = firstId(doc);
		const variable = addPaintVariable(doc, "gradient");

		bindFill(doc, [layer], variable);

		expect(doc.layer(layer)?.bindings.fill).toEqual({ var: variable });
		expect(doc.layer(layer)?.fill).toBe("linear-gradient(180deg, #0d99ff 0%, #8b5cf6 100%)");
		doc.undo();
		expect(doc.layer(layer)?.bindings.fill).toBeUndefined();
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

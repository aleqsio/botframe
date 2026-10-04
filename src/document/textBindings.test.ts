import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import type { LayerFields, LayerId } from "./layer";
import { DEFAULT_TEXT_STYLE } from "./text";
import type { TextGeometry } from "./text";
import { DOCUMENT_SCOPE } from "./variable";

const HELLO: TextGeometry = { kind: "text", content: "Hello", ...DEFAULT_TEXT_STYLE };
const FIELDS: LayerFields = {
	x: 0,
	y: 0,
	width: 100,
	height: 20,
	fill: "#000000",
	name: "",
	clip: false,
	geometry: HELLO,
};

function boundText(): { doc: DesignDocument; id: LayerId } {
	const doc = DesignDocument.create();
	const scope = doc.components.scope(DOCUMENT_SCOPE);
	scope.put({ id: "title", name: "title", type: "text", initial: "Welcome", options: [] });
	scope.put({ id: "size", name: "size", type: "length", initial: 32, options: [] });
	const id = doc.createLayer(FIELDS);
	doc.update(id, { bindings: { content: { var: "title" }, fontSize: { var: "size" } } });
	doc.commit("bind");
	return { doc, id };
}

describe("the bindings of a text layer", () => {
	it("shows the text and the size of the variables", () => {
		const { doc, id } = boundText();

		expect(doc.layer(id)?.geometry).toMatchObject({ content: "Welcome", fontSize: 32 });
	});

	it("drops the binding of the text when the user types, and keeps the binding of the size", () => {
		const { doc, id } = boundText();

		doc.update(id, { geometry: { ...HELLO, content: "Typed", fontSize: 32 } });

		expect(doc.layer(id)?.geometry).toMatchObject({ content: "Typed", fontSize: 32 });
		expect(doc.layer(id)?.bindings).toEqual({ fontSize: { var: "size" } });
	});
});

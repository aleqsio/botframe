import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { pickedInside } from "./pickTarget";

const FRAME: LayerFields = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
};

const BOX: LayerFields = {
	...FRAME,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

function nest(middle: LayerFields): {
	doc: DesignDocument;
	outer: LayerId;
	inner: LayerId;
	leaf: LayerId;
} {
	const doc = DesignDocument.create();
	const outer = doc.createLayer(FRAME);
	const inner = doc.createLayer(middle, outer);
	const leaf = doc.createLayer(BOX, inner);
	return { doc, outer, inner, leaf };
}

describe("the layer that a click inside the selection picks", () => {
	it("is the layer under the pointer, at any depth below the selected frame", () => {
		const { doc, outer, leaf } = nest(FRAME);

		expect(pickedInside((id) => doc.layer(id), [outer], leaf)).toBe(leaf);
	});

	it("is the group between the selected frame and the layer under the pointer", () => {
		const { doc, outer, inner, leaf } = nest({ ...FRAME, geometry: { kind: "group" } });

		expect(pickedInside((id) => doc.layer(id), [outer], leaf)).toBe(inner);
	});

	it("is nothing when no ancestor of the layer is selected, or the layer itself is selected", () => {
		const { doc, leaf } = nest(FRAME);
		const read = (id: LayerId) => doc.layer(id);

		expect(pickedInside(read, [], leaf)).toBeNull();
		expect(pickedInside(read, [leaf], leaf)).toBeNull();
	});
});

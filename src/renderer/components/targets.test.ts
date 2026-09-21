import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { firstId } from "../input/toolFixtures";
import { boxField, fieldEdit, fieldGroupsOf } from "./layerFields";
import { editEach, plainEdit } from "./targets";

const ELLIPSE: LayerFields = {
	x: 0,
	y: 0,
	width: 50,
	height: 50,
	fill: "#ffffff",
	name: "",
	clip: false,
	geometry: { kind: "ellipse" },
};

function pairOf(): { doc: DesignDocument; ids: readonly [LayerId, LayerId] } {
	const doc = DesignDocument.create();
	const second = doc.createLayer(ELLIPSE);
	doc.commit("create ellipse");
	return { doc, ids: [firstId(doc), second] };
}

describe("editEach", () => {
	it("writes the same patch to each layer", () => {
		const { doc, ids } = pairOf();

		editEach(doc, ids, plainEdit({ fill: "#ff0000" }));

		expect(ids.map((id) => doc.layer(id)?.fill)).toEqual(["#ff0000", "#ff0000"]);
	});

	it("gives each layer its own patch from its own state", () => {
		const { doc, ids } = pairOf();

		editEach(doc, ids, (layer) => ({ x: layer.x + 10 }));

		expect(ids.map((id) => doc.layer(id)?.x)).toEqual([430, 10]);
	});

	it("passes over a layer for which the edit gives null, and a layer the document lost", () => {
		const { doc, ids } = pairOf();

		editEach(doc, [...ids, "9@9"], (layer) =>
			layer.geometry.kind === "ellipse" ? null : { x: 1 },
		);

		expect(ids.map((id) => doc.layer(id)?.x)).toEqual([1, 0]);
	});
});

describe("a field edit on more than one layer", () => {
	it("sets the corner of each rectangle and leaves an ellipse alone", () => {
		const { doc, ids } = pairOf();
		const [first] = ids;
		const seed = doc.layer(first);
		if (seed === null) {
			throw new Error("no layer");
		}
		const radius = fieldGroupsOf(seed).flatMap((group) => group.fields)[1];
		if (radius === undefined) {
			throw new Error("no corner field");
		}

		editEach(doc, ids, fieldEdit(radius, 8));

		expect(doc.layer(ids[0])?.geometry).toMatchObject({ kind: "rectangle", cornerRadius: 8 });
		expect(doc.layer(ids[1])?.geometry).toEqual({ kind: "ellipse" });
	});

	it("converts the unit of each layer from its own length", () => {
		const doc = DesignDocument.create();
		const parent = firstId(doc);
		const wide = doc.createLayer({ ...ELLIPSE, width: 120 }, parent);
		const narrow = doc.createLayer({ ...ELLIPSE, width: 60 }, parent);
		doc.commit("create children");
		const shown = doc.layer(wide);
		if (shown === null) {
			throw new Error("no layer");
		}
		const field = boxField("W", "width", shown, (target) => doc.basisOf(target.id));
		if (field.choice === null) {
			throw new Error("no unit choice");
		}

		editEach(doc, [wide, narrow, parent], field.choice.convert("%"));

		expect(doc.layer(wide)?.lengths.width).toEqual({ value: 50, unit: "%" });
		expect(doc.layer(narrow)?.lengths.width).toEqual({ value: 25, unit: "%" });
		expect(doc.layer(parent)?.lengths.width).toEqual({ value: 240, unit: "px" });
	});
});

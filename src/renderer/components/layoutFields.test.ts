import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { DRAWN, firstId } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import type { Layout } from "../../document/layout";
import {
	addedGuide,
	cellGroupOf,
	guideField,
	layoutGroupsOf,
	layoutWithKind,
	removedGuide,
} from "./layoutFields";

const ROW: Layout = { kind: "flex", direction: "row", gap: 8, padding: 12 };
const GRID: Layout = { kind: "grid", columns: 3, rows: 2, gap: 8, padding: 12 };

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function gridScene(): { doc: DesignDocument; box: Layer; child: Layer } {
	const doc = DesignDocument.create();
	const box = doc.createLayer({ ...DRAWN, width: 300, height: 200 });
	doc.update(box, { layout: GRID });
	const child = doc.createLayer({ ...DRAWN, width: 10, height: 10 }, box);
	return { doc, box: layerOf(doc, box), child: layerOf(doc, child) };
}

describe("layoutWithKind", () => {
	it("keeps the gap and the padding across kinds", () => {
		expect(layoutWithKind(ROW, "grid")).toEqual({ ...GRID, columns: 2, rows: 2 });
		expect(layoutWithKind(GRID, "flex")).toEqual(ROW);
		expect(layoutWithKind(ROW, "free")).toEqual({ kind: "free" });
		expect(layoutWithKind({ kind: "free" }, "flex")).toEqual({ ...ROW, gap: 0, padding: 0 });
	});
});

describe("layoutGroupsOf", () => {
	it("gives spacing fields for flex, tracks and spacing for grid, nothing for free", () => {
		expect(layoutGroupsOf({ kind: "free" })).toEqual([]);
		expect(layoutGroupsOf(ROW).map((group) => group.name)).toEqual(["Spacing"]);
		expect(layoutGroupsOf(GRID).map((group) => group.name)).toEqual(["Tracks", "Spacing"]);
	});

	it("reads and patches one field of the layout and keeps the others", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { layout: GRID });
		const [tracks] = layoutGroupsOf(GRID);
		const rows = tracks?.fields.find((field) => field.label === "Rows");
		expect(rows?.read(layerOf(doc, id))).toBe(2);
		expect(rows?.patch(4.4)).toEqual({ layout: { ...GRID, rows: 4 } });
		expect(rows?.bound).toEqual({ kind: "clamp", min: 1, max: 100 });
	});
});

describe("cellGroupOf", () => {
	it("gives nothing outside a grid", () => {
		const doc = DesignDocument.create();
		expect(cellGroupOf(layerOf(doc, firstId(doc)), null)).toBeNull();
	});

	it("shows the cell one-based and writes it zero-based, within the tracks", () => {
		const { doc, box, child } = gridScene();
		doc.update(child.id, { cell: { column: 2, row: 1 } });
		const held = layerOf(doc, child.id);
		const group = cellGroupOf(held, box);
		const [column, row] = group?.fields ?? [];

		expect(column?.read(held)).toBe(3);
		expect(row?.read(held)).toBe(2);
		expect(column?.bound).toEqual({ kind: "clamp", min: 1, max: 3 });
		expect(column?.patch(1)).toEqual({ cell: { column: 0, row: 1 } });
		expect(row?.patch(1)).toEqual({ cell: { column: 2, row: 0 } });
	});
});

describe("guides", () => {
	it("adds a guide at the middle of the layer and takes one away", () => {
		const doc = DesignDocument.create();
		const layer = layerOf(doc, firstId(doc));
		expect(addedGuide(layer, "x")).toEqual({ guides: [{ axis: "x", at: 120 }] });
		expect(addedGuide(layer, "y")).toEqual({ guides: [{ axis: "y", at: 80 }] });

		doc.update(layer.id, {
			guides: [
				{ axis: "x", at: 1 },
				{ axis: "y", at: 2 },
			],
		});
		expect(removedGuide(layerOf(doc, layer.id), 0)).toEqual({ guides: [{ axis: "y", at: 2 }] });
	});

	it("reads and moves one guide by its index", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, {
			guides: [
				{ axis: "x", at: 1 },
				{ axis: "y", at: 2 },
			],
		});
		const field = guideField(layerOf(doc, id), 1);
		expect(field.label).toBe("Horizontal");
		expect(field.read(layerOf(doc, id))).toBe(2);
		expect(field.patch(9)).toEqual({
			guides: [
				{ axis: "x", at: 1 },
				{ axis: "y", at: 9 },
			],
		});
	});
});

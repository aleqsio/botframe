import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { isFullyTransparent, layerIdsUnder, visibleLayerIds } from "./hitTest";
import type { HitElement } from "./hitTest";

const TOP = "3@1" as LayerId;
const MIDDLE = "2@1" as LayerId;
const BOTTOM = "1@1" as LayerId;

function element(layerId: string | null): HitElement {
	return { getAttribute: (name) => (name === "data-layer-id" ? layerId : null) };
}

function fills(table: Readonly<Record<string, string>>): (id: LayerId) => string | null {
	return (id) => table[id] ?? null;
}

describe("layerIdsUnder", () => {
	it("keeps the order of the hit test, which gives the topmost element first", () => {
		expect(layerIdsUnder([element(TOP), element(MIDDLE), element(BOTTOM)])).toEqual([
			TOP,
			MIDDLE,
			BOTTOM,
		]);
	});

	it("drops an element with no layer id and an id that does not parse", () => {
		expect(layerIdsUnder([element(null), element("viewport"), element(TOP), element("")])).toEqual([
			TOP,
		]);
	});
});

describe("visibleLayerIds", () => {
	it("skips a layer with a fully transparent fill", () => {
		const ids = visibleLayerIds(
			[TOP, MIDDLE, BOTTOM],
			fills({ [TOP]: "#00000000", [MIDDLE]: "rgb(255 0 0 / 0.4)", [BOTTOM]: "#ffffff" }),
		);

		expect(ids).toEqual([MIDDLE, BOTTOM]);
	});

	it("skips a layer that the document does not hold", () => {
		expect(visibleLayerIds([TOP, BOTTOM], fills({ [BOTTOM]: "#ffffff" }))).toEqual([BOTTOM]);
	});
});

describe("isFullyTransparent", () => {
	it.each([
		"transparent",
		"#0000",
		"#1230",
		"#11223300",
		"rgb(17 34 51 / 0)",
		"rgba(17, 34, 51, 0)",
		"rgba(17, 34, 51, 0.0)",
		"rgb(17 34 51 / 0%)",
		"  TRANSPARENT  ",
	])("answers yes for %s", (color) => {
		expect(isFullyTransparent(color)).toBe(true);
	});

	it.each([
		"#000",
		"#0001",
		"#112233",
		"#11223380",
		"#aabb00",
		"rgb(17 34 51)",
		"rgb(17 34 51 / 0.4)",
		"rgba(17, 34, 51, 0.5)",
		"rgb(17 34 51 / 40%)",
		"red",
	])("answers no for %s", (color) => {
		expect(isFullyTransparent(color)).toBe(false);
	});
});

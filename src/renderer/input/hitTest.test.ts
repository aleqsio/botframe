import { describe, expect, it } from "vitest";
import { NO_CONTENT } from "../../document/layer";
import type { LayerId } from "../../document/layer";
import { isAssetId } from "../../document/assets";
import type { AssetId } from "../../document/assets";
import { isFullyTransparent, layerIdsUnder, visibleLayerIds } from "./hitTest";
import type { HitElement, Paint } from "./hitTest";

const TOP = "3@1" as LayerId;
const MIDDLE = "2@1" as LayerId;
const BOTTOM = "1@1" as LayerId;

function element(layerId: string | null): HitElement {
	return { getAttribute: (name) => (name === "data-layer-id" ? layerId : null) };
}

function assetId(text: string): AssetId {
	if (!isAssetId(text)) {
		throw new Error("the text is not a content address");
	}
	return text;
}

const PICTURE = assetId("a".repeat(64));

function fills(table: Readonly<Record<string, string>>): (id: LayerId) => Paint | null {
	return (id) => {
		const fill = table[id];
		return fill === undefined ? null : { fill, media: null, content: NO_CONTENT };
	};
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

	it("keeps a layer with a transparent fill and a media fill", () => {
		const ids = visibleLayerIds([TOP], () => ({
			fill: "transparent",
			media: { asset: PICTURE, fit: "cover" },
			content: NO_CONTENT,
		}));

		expect(ids).toEqual([TOP]);
	});

	it("keeps a component instance with a fully transparent fill, because its markup paints it", () => {
		const instance: Paint = {
			fill: "#00000000",
			media: null,
			content: { kind: "component", component: "abc", props: {} },
		};

		expect(visibleLayerIds([TOP, BOTTOM], (id) => (id === TOP ? instance : null))).toEqual([TOP]);
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

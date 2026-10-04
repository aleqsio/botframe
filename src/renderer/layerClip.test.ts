import { describe, expect, it } from "vitest";
import { DesignDocument } from "../document/document";
import type { LayerFields, LayerId } from "../document/layer";
import { layerClipShape, withLayerClip } from "./layerClip";

const RECTANGLE: LayerFields = {
	x: 100,
	y: 100,
	width: 200,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

function clipOf(doc: DesignDocument, id: LayerId): string | undefined {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layerClipShape((held) => doc.layer(held), layer);
}

function clippedBy(source: Partial<LayerFields>): { doc: DesignDocument; target: LayerId } {
	const doc = DesignDocument.create();
	const target = doc.createLayer(RECTANGLE);
	const blob = doc.createLayer({ ...RECTANGLE, ...source });
	doc.update(target, { clipLayer: blob });
	return { doc, target };
}

describe("layerClipShape", () => {
	it("writes the outline of a source in the same box as the box itself", () => {
		const { doc, target } = clippedBy({});

		expect(clipOf(doc, target)).toBe(
			"shape(from 0% 0%, line to 100% 0%, line to 100% 100%, line to 0% 100%, line to 0% 0%, close)",
		);
	});

	it("moves the outline into the box of the target", () => {
		const { doc, target } = clippedBy({ x: 150, y: 125, width: 100, height: 50 });

		expect(clipOf(doc, target)).toBe(
			"shape(from 25% 25%, line to 75% 25%, line to 75% 75%, line to 25% 75%, line to 25% 25%, close)",
		);
	});

	it("turns the outline of a turned source, so the cut stays where the source is", () => {
		const { doc, target } = clippedBy({ x: 150, y: 100, width: 100, height: 100, rotation: 90 });

		expect(clipOf(doc, target)).toBe(
			"shape(from 75% 0%, line to 75% 100%, line to 25% 100%, line to 25% 0%, line to 75% 0%, close)",
		);
	});

	it("gives no clip for a source that holds the target, or that is lost", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer(RECTANGLE);
		const child = doc.createLayer(RECTANGLE, frame);
		doc.update(child, { clipLayer: frame });

		expect(clipOf(doc, child)).toBeUndefined();
		doc.deleteLayer(frame);
		const orphan = doc.createLayer({ ...RECTANGLE });
		doc.update(orphan, { clipLayer: frame });
		expect(clipOf(doc, orphan)).toBeUndefined();
	});
});

describe("withLayerClip", () => {
	const style = { background: "#d9d9d9", overflow: "hidden" } as const;

	it("puts the clip shape in place of the own clip, and hides a source", () => {
		expect(withLayerClip(style, "shape(…)", false)).toEqual({
			background: "#d9d9d9",
			clipPath: "shape(…)",
			overflow: undefined,
		});
		expect(withLayerClip(style, undefined, true)).toEqual({ ...style, visibility: "hidden" });
		expect(withLayerClip(style, undefined, false)).toBe(style);
	});
});

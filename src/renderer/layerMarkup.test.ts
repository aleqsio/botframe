import { describe, expect, it } from "vitest";
import { pixelLengths } from "../document/documentFixtures";
import { DEFAULT_LAYOUT } from "../document/layout";
import type { LayerFields } from "../document/layer";
import type { LayerNode } from "../document/subtree";
import { layerStyle } from "./layerStyle";
import { layerMarkup } from "./layerMarkup";

const FIELDS: LayerFields = {
	x: 10,
	y: 20,
	width: 30,
	height: 40,
	fill: "#123456",
	name: "Box",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 4, cornerSmoothing: 0, artboard: false },
};

function nodeOf(fields: Partial<LayerFields>, children: readonly LayerNode[] = []): LayerNode {
	const merged = { ...FIELDS, ...fields };
	return {
		fields: merged,
		rotation: 0,
		lengths: pixelLengths(merged),
		layout: DEFAULT_LAYOUT,
		children,
	};
}

describe("layerMarkup", () => {
	it("gives the same bytes for the same subtree", () => {
		const node = nodeOf({}, [nodeOf({ x: 1 })]);
		expect(layerMarkup(node)).toBe(layerMarkup(node));
	});

	it("writes the style properties in one order that does not follow the order of the object", () => {
		expect(layerMarkup(nodeOf({}))).toBe(
			'<div style="background: #123456; border-radius: 4px; display: block;' +
				" height: 40px;" +
				' transform: translate3d(10px, 20px, 0); width: 30px"></div>',
		);
	});

	it("holds each declaration that the render path gives", () => {
		const node = nodeOf({ clip: true, geometry: { kind: "ellipse" } });
		const markup = layerMarkup(node);

		for (const [key, value] of Object.entries(
			layerStyle({ ...node.fields, rotation: 0, layout: node.layout }, null),
		)) {
			expect(markup).toContain(String(value));
			expect(key.length).toBeGreaterThan(0);
		}
		expect(markup).toContain("border-radius: 50%");
		expect(markup).toContain("overflow: hidden");
	});

	it("keeps the shape of the tree", () => {
		const markup = layerMarkup(nodeOf({}, [nodeOf({ x: 1 }, [nodeOf({ x: 2 })])]));
		expect(markup.match(/<div/gu)).toHaveLength(3);
		expect(markup.endsWith("</div></div></div>")).toBe(true);
	});

	it("escapes the text that a path geometry puts in the attribute", () => {
		const markup = layerMarkup(nodeOf({ geometry: { kind: "path", d: '" onload="alert(1)' } }));
		expect(markup).toContain("clip-path: path(&quot;&quot; onload=&quot;alert(1)&quot;)");
		expect(markup).not.toContain('onload="');
	});

	it("writes the angle of a layer that a person turned", () => {
		const node: LayerNode = {
			fields: FIELDS,
			rotation: 30,
			lengths: pixelLengths(FIELDS),
			layout: DEFAULT_LAYOUT,
			children: [],
		};
		expect(layerMarkup(node)).toContain("rotate(30deg)");
	});
});

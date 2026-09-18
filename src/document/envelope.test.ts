import { describe, expect, it } from "vitest";
import { nodeBox } from "./documentFixtures";
import { parseEnvelope, serializeEnvelope } from "./envelope";
import type { LayerNode } from "./subtree";
import { PLAIN_RECTANGLE } from "./subtree";

const CHILD: LayerNode = {
	fields: {
		x: 1,
		y: 2,
		width: 3,
		height: 4,
		fill: "#ff0000",
		name: "Child",
		clip: true,
		geometry: { kind: "path", d: "M0 0 L1 1 Z" },
	},
	rotation: 15,
	...nodeBox({ x: 1, y: 2, width: 3, height: 4 }),
	children: [],
};

const ROOT: LayerNode = {
	fields: {
		x: 10,
		y: 20,
		width: 30,
		height: 40,
		fill: "#00ff00",
		name: "Root",
		clip: false,
		geometry: { kind: "rectangle", cornerRadius: 8, cornerSmoothing: 0.5, artboard: true },
	},
	rotation: 0,
	...nodeBox({ x: 10, y: 20, width: 30, height: 40 }),
	children: [CHILD],
};

function envelopeWith(body: Record<string, unknown>): string {
	return JSON.stringify({ kind: "botframe/layers", version: 1, sourceParent: null, ...body });
}

describe("serializeEnvelope", () => {
	it("gives the same bytes for the same subtree", () => {
		const once = serializeEnvelope({ sourceParent: "1@1", layers: [ROOT] });
		const again = serializeEnvelope({ sourceParent: "1@1", layers: [ROOT] });
		expect(once).toBe(again);
	});

	it("carries the parent of the source and the tree", () => {
		expect(parseEnvelope(serializeEnvelope({ sourceParent: "1@1", layers: [ROOT] }))).toEqual({
			sourceParent: "1@1",
			layers: [ROOT],
		});
	});
});

describe("parseEnvelope", () => {
	it("reads a tree that a copy wrote", () => {
		const raw = serializeEnvelope({ sourceParent: null, layers: [ROOT, CHILD] });
		expect(parseEnvelope(raw)?.layers).toEqual([ROOT, CHILD]);
	});

	it("gives null for a kind, a version, or a layer list that it does not know", () => {
		expect(parseEnvelope(envelopeWith({ kind: "text/plain", layers: [] }))).toBeNull();
		expect(parseEnvelope(envelopeWith({ version: 2, layers: [] }))).toBeNull();
		expect(parseEnvelope(envelopeWith({ layers: "one layer" }))).toBeNull();
		expect(parseEnvelope(envelopeWith({}))).toBeNull();
	});

	it("gives null for junk and for an empty string, and throws nothing", () => {
		expect(parseEnvelope("")).toBeNull();
		expect(parseEnvelope("not json at all")).toBeNull();
		expect(parseEnvelope("[]")).toBeNull();
		expect(parseEnvelope("null")).toBeNull();
		expect(parseEnvelope("42")).toBeNull();
	});

	it("reads a geometry kind that this version does not know as a plain rectangle", () => {
		const raw = envelopeWith({
			layers: [{ fields: { x: 5, geometry: { kind: "shader", source: "noise" } } }],
		});
		expect(parseEnvelope(raw)?.layers[0]?.fields).toEqual({
			x: 5,
			y: 0,
			width: 0,
			height: 0,
			fill: "#000000",
			name: "",
			clip: false,
			geometry: PLAIN_RECTANGLE,
		});
	});

	it("reads a field of the wrong type as the fallback of that field", () => {
		const raw = envelopeWith({
			layers: [{ fields: { x: "far", fill: 7, name: null, clip: "yes" }, rotation: "half" }],
		});
		expect(parseEnvelope(raw)?.layers[0]).toEqual({
			fields: {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				fill: "#000000",
				name: "",
				clip: false,
				geometry: PLAIN_RECTANGLE,
			},
			rotation: 0,
			...nodeBox({ x: 0, y: 0, width: 0, height: 0 }),
			children: [],
		});
	});

	it("keeps the shape of a tree that holds a child under a child", () => {
		const raw = envelopeWith({ layers: [{ children: [{ children: [{}] }] }] });
		const [layer] = parseEnvelope(raw)?.layers ?? [];
		expect(layer?.children[0]?.children).toHaveLength(1);
	});

	it("carries a layout, a cell, and the guides of a node, and drops the bad ones", () => {
		const held: LayerNode = {
			...ROOT,
			layout: { kind: "grid", columns: 2, rows: 3, gap: 4, padding: 5 },
			cell: { column: 1, row: 2 },
			guides: [{ axis: "x", at: 10 }],
			children: [],
		};
		expect(parseEnvelope(serializeEnvelope({ sourceParent: null, layers: [held] }))).toEqual({
			sourceParent: null,
			layers: [held],
		});

		const raw = envelopeWith({
			layers: [{ ...held, layout: { kind: "stack" }, cell: 4, guides: [{ axis: "x" }] }],
		});
		expect(parseEnvelope(raw)?.layers[0]).toMatchObject({
			layout: { kind: "free" },
			cell: null,
			guides: [],
		});
	});

	it("gives null for a source parent that is not a string", () => {
		expect(parseEnvelope(envelopeWith({ sourceParent: 7, layers: [] }))?.sourceParent).toBeNull();
	});
});

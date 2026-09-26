import { describe, expect, it } from "vitest";
import { nodeBox } from "./documentFixtures";
import { PLAIN_INSTANCE } from "./layer";
import { DEFAULT_LAYOUT } from "./layout";
import { parseEnvelope, serializeEnvelope } from "./envelope";
import type { PackedComponent } from "./componentPack";
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
	skewX: 0,
	skewY: 0,
	mirrored: true,
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
		geometry: { kind: "rectangle", cornerRadius: 8, cornerSmoothing: 0.5, frame: true },
	},
	rotation: 0,
	skewX: 0,
	skewY: 0,
	mirrored: false,
	...nodeBox({ x: 10, y: 20, width: 30, height: 40 }),
	children: [CHILD],
};

function envelopeWith(body: Record<string, unknown>): string {
	return JSON.stringify({ kind: "botframe/layers", version: 2, sourceParent: null, ...body });
}

describe("serializeEnvelope", () => {
	it("gives the same bytes for the same subtree", () => {
		const once = serializeEnvelope({
			sourceParent: "1@1",
			sourceIds: ["2@1"],
			layers: [ROOT],
			components: {},
		});
		const again = serializeEnvelope({
			sourceParent: "1@1",
			sourceIds: ["2@1"],
			layers: [ROOT],
			components: {},
		});
		expect(once).toBe(again);
	});

	it("carries the parent of the source and the tree", () => {
		expect(
			parseEnvelope(
				serializeEnvelope({
					sourceParent: "1@1",
					sourceIds: ["2@1"],
					layers: [ROOT],
					components: {},
				}),
			),
		).toEqual({
			sourceParent: "1@1",
			sourceIds: ["2@1"],
			layers: [ROOT],
			components: {},
		});
	});
});

describe("parseEnvelope", () => {
	it("reads a tree that a copy wrote", () => {
		const raw = serializeEnvelope({
			sourceParent: null,
			sourceIds: [],
			layers: [ROOT, CHILD],
			components: {},
		});
		expect(parseEnvelope(raw)?.layers).toEqual([ROOT, CHILD]);
	});

	it("gives null for a kind, a version, or a layer list that it does not know", () => {
		expect(parseEnvelope(envelopeWith({ kind: "text/plain", layers: [] }))).toBeNull();
		expect(parseEnvelope(envelopeWith({ version: 1, layers: [] }))).toBeNull();
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
			layers: [
				{
					fields: { x: "far", fill: 7, name: null, clip: "yes" },
					rotation: "half",
					mirrored: "yes",
				},
			],
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
			skewX: 0,
			skewY: 0,
			mirrored: false,
			...nodeBox({ x: 0, y: 0, width: 0, height: 0 }),
			children: [],
		});
	});

	it("reads a layer that an older copy wrote without an origin as turned about its center", () => {
		const parsed = parseEnvelope(envelopeWith({ layers: [{ fields: {}, origin: { x: "far" } }] }));

		expect(parsed?.layers[0]?.origin).toEqual({ x: 0.5, y: 0.5 });
	});

	it("reads the layout of a layer and falls back to the default for a layout that is broken", () => {
		const held = { ...ROOT, layout: { ...DEFAULT_LAYOUT, display: "grid" as const } };
		const kept = parseEnvelope(
			serializeEnvelope({ sourceParent: null, sourceIds: [], layers: [held], components: {} }),
		);
		expect(kept?.layers[0]?.layout.display).toBe("grid");

		const broken = envelopeWith({ layers: [{ layout: { display: "masonry", wrap: "yes" } }] });
		expect(parseEnvelope(broken)?.layers[0]?.layout).toEqual(DEFAULT_LAYOUT);
	});

	it("keeps the shape of a tree that holds a child under a child", () => {
		const raw = envelopeWith({ layers: [{ children: [{ children: [{}] }] }] });
		const [layer] = parseEnvelope(raw)?.layers ?? [];
		expect(layer?.children[0]?.children).toHaveLength(1);
	});

	it("gives null for a source parent that is not a string", () => {
		expect(parseEnvelope(envelopeWith({ sourceParent: 7, layers: [] }))?.sourceParent).toBeNull();
	});

	it("keeps only the source ids that are strings", () => {
		const raw = envelopeWith({ sourceIds: ["2@1", 7, null], layers: [] });
		expect(parseEnvelope(raw)?.sourceIds).toEqual(["2@1"]);
		expect(parseEnvelope(envelopeWith({ layers: [] }))?.sourceIds).toEqual([]);
	});

	it("carries a component copy, its bindings, and the components it uses, and drops a broken one", () => {
		const instance: LayerNode = {
			...CHILD,
			content: {
				kind: "component",
				component: "v1",
				props: { label: "Agree", checked: true, tone: { var: "t1" } },
				values: {},
				instance: PLAIN_INSTANCE,
			},
			bindings: { fill: { var: "c1" } },
		};
		const source: PackedComponent = {
			name: "Checkbox",
			body: {
				kind: "html",
				address: "a".repeat(64),
				source: { name: "Checkbox", html: "<b>{{label}}</b>", css: "", props: [] },
			},
			variables: [{ id: "t1", name: "label", type: "text", initial: "Agree", options: [] }],
		};
		const raw = serializeEnvelope({
			sourceParent: null,
			sourceIds: [],
			layers: [instance],
			components: { v1: source },
		});
		const broken = envelopeWith({
			layers: [
				{ content: { kind: "component", component: "v1", props: { label: { nested: 4 } } } },
			],
			components: { v1: { name: "Checkbox", html: "{{#open}}", css: "" } },
		});

		expect(parseEnvelope(raw)?.layers[0]?.content).toEqual(instance.content);
		expect(parseEnvelope(raw)?.layers[0]?.bindings).toEqual({ fill: { var: "c1" } });
		expect(parseEnvelope(raw)?.components).toEqual({ v1: source });
		expect(parseEnvelope(broken)?.layers[0]?.content).toEqual({
			kind: "component",
			component: "v1",
			props: {},
			values: {},
			instance: PLAIN_INSTANCE,
		});
		expect(parseEnvelope(broken)?.components).toEqual({});
	});
});

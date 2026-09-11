import type { LayerFields, WritableGeometry } from "./layer";
import { PLAIN_RECTANGLE } from "./subtree";
import type { LayerNode } from "./subtree";

const KIND = "botframe/layers";
const VERSION = 1;
const DEFAULT_FILL = "#000000";
const NO_FIELDS: Bag = {};

type Bag = Readonly<Record<string, unknown>>;

export interface LayerEnvelope {
	sourceParent: string | null;
	layers: readonly LayerNode[];
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null;
}

function isList(value: unknown): value is readonly unknown[] {
	return Array.isArray(value);
}

function bagOf(value: unknown): Bag {
	return isBag(value) ? value : NO_FIELDS;
}

function listOf(value: unknown): readonly unknown[] {
	return isList(value) ? value : [];
}

function count(bag: Bag, key: string): number {
	const value = bag[key];
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function flag(bag: Bag, key: string): boolean {
	return bag[key] === true;
}

function words(bag: Bag, key: string, fallback: string): string {
	const value = bag[key];
	return typeof value === "string" ? value : fallback;
}

const SHAPES: Readonly<Record<WritableGeometry["kind"], (bag: Bag) => WritableGeometry>> = {
	rectangle: (bag) => ({
		kind: "rectangle",
		cornerRadius: count(bag, "cornerRadius"),
		cornerSmoothing: count(bag, "cornerSmoothing"),
		artboard: flag(bag, "artboard"),
	}),
	ellipse: () => ({ kind: "ellipse" }),
	path: (bag) => ({ kind: "path", d: words(bag, "d", "") }),
};

function shapeOf(value: unknown): WritableGeometry {
	const shapes: Readonly<Record<string, (bag: Bag) => WritableGeometry>> = SHAPES;
	const bag = bagOf(value);
	const shape = shapes[words(bag, "kind", "")];
	return shape === undefined ? PLAIN_RECTANGLE : shape(bag);
}

function fieldsOf(bag: Bag): LayerFields {
	return {
		x: count(bag, "x"),
		y: count(bag, "y"),
		width: count(bag, "width"),
		height: count(bag, "height"),
		fill: words(bag, "fill", DEFAULT_FILL),
		name: words(bag, "name", ""),
		clip: flag(bag, "clip"),
		geometry: shapeOf(bag["geometry"]),
	};
}

function nodeOf(value: unknown): LayerNode {
	const bag = bagOf(value);
	return {
		fields: fieldsOf(bagOf(bag["fields"])),
		rotation: count(bag, "rotation"),
		children: listOf(bag["children"]).map((child) => nodeOf(child)),
	};
}

function jsonOf(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

export function serializeEnvelope(envelope: LayerEnvelope): string {
	return JSON.stringify({
		kind: KIND,
		version: VERSION,
		sourceParent: envelope.sourceParent,
		layers: envelope.layers,
	});
}

export function parseEnvelope(raw: string): LayerEnvelope | null {
	const bag = bagOf(jsonOf(raw));
	if (bag["kind"] !== KIND || bag["version"] !== VERSION || !isList(bag["layers"])) {
		return null;
	}
	const parent = bag["sourceParent"];
	return {
		sourceParent: typeof parent === "string" ? parent : null,
		layers: listOf(bag["layers"]).map((layer) => nodeOf(layer)),
	};
}

import { bagOf, isList, listOf } from "./bag";
import type { Bag } from "./bag";
import { bindingsOf } from "./bindings";
import { packedOf } from "./componentPack";
import type { PackedComponent } from "./componentPack";
import { CENTER_ORIGIN, NO_CONTENT, heldSkew } from "./layer";
import type { LayerContent, LayerFields, Origin, WritableGeometry } from "./layer";
import { assignmentsOf, instanceFrom } from "./layerLinks";
import { guidesOf } from "./guides";
import { layoutOf } from "./layout";
import { PIXELS, isUnit } from "./length";
import { mediaOf } from "./media";
import type { LayerLengths, Length } from "./length";
import { PLAIN_RECTANGLE } from "./subtree";
import type { LayerNode } from "./subtree";

const KIND = "botframe/layers";
const VERSION = 2;
const DEFAULT_FILL = "#000000";

export interface LayerEnvelope {
	sourceParent: string | null;
	sourceIds: readonly string[];
	layers: readonly LayerNode[];
	components: Readonly<Record<string, PackedComponent>>;
}

function count(bag: Bag, key: string): number {
	return countOr(bag, key, 0);
}

function countOr(bag: Bag, key: string, fallback: number): number {
	const value = bag[key];
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
		frame: flag(bag, "frame"),
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

function lengthOf(value: unknown, pixels: number): Length {
	const bag = bagOf(value);
	const unit = words(bag, "unit", "");
	return isUnit(unit) ? { value: count(bag, "value"), unit } : { value: pixels, unit: PIXELS };
}

function lengthsOf(value: unknown, fields: LayerFields): LayerLengths {
	const bag = bagOf(value);
	return {
		x: lengthOf(bag["x"], fields.x),
		y: lengthOf(bag["y"], fields.y),
		width: lengthOf(bag["width"], fields.width),
		height: lengthOf(bag["height"], fields.height),
	};
}

function originOf(value: unknown): Origin {
	const bag = bagOf(value);
	return { x: countOr(bag, "x", CENTER_ORIGIN.x), y: countOr(bag, "y", CENTER_ORIGIN.y) };
}

function contentOf(value: unknown): LayerContent {
	const bag = bagOf(value);
	const component = words(bag, "component", "");
	if (bag["kind"] !== "component" || component === "") {
		return NO_CONTENT;
	}
	return {
		kind: "component",
		component,
		props: assignmentsOf(bag["props"]),
		values: {},
		instance: instanceFrom(bag["instance"]),
	};
}

function componentsOf(value: unknown): Readonly<Record<string, PackedComponent>> {
	return Object.fromEntries(
		Object.entries(bagOf(value)).flatMap(([id, packed]) => {
			const held = packedOf(packed, nodeOf);
			return held === null ? [] : [[id, held]];
		}),
	);
}

function nodeOf(value: unknown): LayerNode {
	const bag = bagOf(value);
	const fields = fieldsOf(bagOf(bag["fields"]));
	return {
		fields,
		rotation: count(bag, "rotation"),
		skewX: heldSkew(count(bag, "skewX")),
		skewY: heldSkew(count(bag, "skewY")),
		mirrored: flag(bag, "mirrored"),
		origin: originOf(bag["origin"]),
		lengths: lengthsOf(bag["lengths"], fields),
		layout: layoutOf(bag["layout"]),
		guides: guidesOf(bag["guides"]),
		media: mediaOf(bag["media"]),
		content: contentOf(bag["content"]),
		bindings: bindingsOf(bag["bindings"]),
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
		sourceIds: envelope.sourceIds,
		layers: envelope.layers,
		components: envelope.components,
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
		sourceIds: listOf(bag["sourceIds"]).filter((id) => typeof id === "string"),
		layers: listOf(bag["layers"]).map((layer) => nodeOf(layer)),
		components: componentsOf(bag["components"]),
	};
}

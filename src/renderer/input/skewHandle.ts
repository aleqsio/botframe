import { heldSkew } from "../../document/layer";
import type { Layer, Pose } from "../../document/layer";
import type { Point } from "../state/camera";
import { ROTATE_REACH } from "./handles";
import { anchoredPlace, fromParentPoint, rotatePoint } from "./layerSpace";
import { degreesOf, radiansOf } from "./linear";
import type { Modifiers } from "./modifiers";
import { ANGLE_SNAP, stepOf } from "./step";

export const SKEW_OFFSET = 18;
const SKEW_REACH = 8;
const SHORTEST_EDGE = 2 * Math.sqrt((ROTATE_REACH + SKEW_REACH) ** 2 - SKEW_OFFSET ** 2);
const MIDDLE = 0.5;

type SkewEdge = "n" | "e" | "s" | "w";
type SkewKey = "skewX" | "skewY";

export interface SkewZone {
	mode: "skew";
	handle: SkewEdge;
}

export interface SkewGrip {
	start: Layer;
	edge: SkewEdge;
	from: Point;
}

export interface SkewMark {
	edge: SkewEdge;
	at: Point;
	outward: Point;
}

interface EdgeRule {
	key: SkewKey;
	sign: number;
	at: Point;
	along: Point;
}

const EDGE_RULES: Readonly<Record<SkewEdge, EdgeRule>> = {
	n: { key: "skewX", sign: -1, at: { x: MIDDLE, y: 0 }, along: { x: 1, y: 0 } },
	s: { key: "skewX", sign: 1, at: { x: MIDDLE, y: 1 }, along: { x: 1, y: 0 } },
	w: { key: "skewY", sign: -1, at: { x: 0, y: MIDDLE }, along: { x: 0, y: 1 } },
	e: { key: "skewY", sign: 1, at: { x: 1, y: MIDDLE }, along: { x: 0, y: 1 } },
};
const SKEW_EDGES: readonly SkewEdge[] = ["n", "e", "s", "w"];

function minus(one: Point, other: Point): Point {
	return { x: one.x - other.x, y: one.y - other.y };
}

function unit(vector: Point): Point | null {
	const length = Math.hypot(vector.x, vector.y);
	return length === 0 ? null : { x: vector.x / length, y: vector.y / length };
}

function outwardOf(edgeLine: Point, fromMiddle: Point): Point | null {
	const normal = unit({ x: -edgeLine.y, y: edgeLine.x });
	if (normal === null) {
		return null;
	}
	const facing = normal.x * fromMiddle.x + normal.y * fromMiddle.y;
	return facing < 0 ? { x: -normal.x, y: -normal.y } : normal;
}

interface MarkSpec {
	chain: readonly Layer[];
	layer: Layer;
	zoom: number;
}

function markOf({ chain, layer, zoom }: MarkSpec, edge: SkewEdge): SkewMark | null {
	const rule = EDGE_RULES[edge];
	const local = { x: rule.at.x * layer.width, y: rule.at.y * layer.height };
	const at = fromParentPoint(chain, local);
	const step = minus(
		fromParentPoint(chain, { x: local.x + rule.along.x, y: local.y + rule.along.y }),
		at,
	);
	const span = rule.key === "skewX" ? layer.width : layer.height;
	if (Math.hypot(step.x, step.y) * span * zoom < SHORTEST_EDGE) {
		return null;
	}
	const middle = fromParentPoint(chain, { x: layer.width / 2, y: layer.height / 2 });
	const outward = outwardOf(step, minus(at, middle));
	return outward === null ? null : { edge, at, outward };
}

export function skewMarksOf(chain: readonly Layer[], zoom: number): SkewMark[] {
	const layer = chain.at(-1);
	if (layer === undefined) {
		return [];
	}
	return SKEW_EDGES.flatMap((edge) => markOf({ chain, layer, zoom }, edge) ?? []);
}

export function skewZoneAt(chain: readonly Layer[], canvas: Point, zoom: number): SkewZone | null {
	const reach = SKEW_OFFSET / zoom;
	const mark = skewMarksOf(chain, zoom).find(({ at, outward }) => {
		const handle = { x: at.x + outward.x * reach, y: at.y + outward.y * reach };
		return Math.hypot(canvas.x - handle.x, canvas.y - handle.y) <= SKEW_REACH / zoom;
	});
	return mark === undefined ? null : { mode: "skew", handle: mark.edge };
}

function snapped(degrees: number, modifiers: Modifiers): number {
	const step = stepOf(ANGLE_SNAP, { ...modifiers, alt: false });
	return heldSkew(step === 0 ? degrees : Math.round(degrees / step) * step) + 0;
}

function spanOf(grip: SkewGrip, modifiers: Modifiers): number {
	const { start, edge } = grip;
	const rule = EDGE_RULES[edge];
	const reach = rule.key === "skewX" ? start.height : start.width * (start.mirrored ? -1 : 1);
	return (modifiers.alt ? MIDDLE : 1) * rule.sign * reach;
}

function skewAfter(grip: SkewGrip, point: Point, modifiers: Modifiers): number {
	const { start, edge, from } = grip;
	const { key } = EDGE_RULES[edge];
	const span = spanOf(grip, modifiers);
	if (span === 0) {
		return start[key];
	}
	const moved = rotatePoint(minus(point, from), -start.rotation);
	const shear = Math.tan(radiansOf(start[key])) + (key === "skewX" ? moved.x : moved.y) / span;
	return snapped(degreesOf(Math.atan(shear)), modifiers);
}

function heldAnchor(edge: SkewEdge, modifiers: Modifiers): Point {
	const { at } = EDGE_RULES[edge];
	return modifiers.alt ? { x: MIDDLE, y: MIDDLE } : { x: 1 - at.x, y: 1 - at.y };
}

type SkewedPatch = Point & Partial<Pick<Pose, SkewKey>>;

export function skewedPatch(grip: SkewGrip, point: Point, modifiers: Modifiers): SkewedPatch {
	const { start, edge } = grip;
	const { key } = EDGE_RULES[edge];
	const skewed = { ...start, [key]: skewAfter(grip, point, modifiers) };
	const anchor = heldAnchor(edge, modifiers);
	const held = fromParentPoint([start], { x: anchor.x * start.width, y: anchor.y * start.height });
	return { [key]: skewed[key], ...anchoredPlace(skewed, anchor, held) };
}

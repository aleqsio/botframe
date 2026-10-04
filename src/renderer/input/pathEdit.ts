import { NO_OFFSET } from "../../document/vertices";
import type { Offset, Vertex } from "../../document/vertices";
import type { Size } from "../../document/length";
import type { Point } from "../state/camera";

export const PART_REACH = 7;
const SMOOTH_REACH = 1 / 3;

type HandleSide = "before" | "after";

export type PathPart = { kind: "vertex"; index: number } | { kind: HandleSide; index: number };

const HANDLE_SIDES: readonly HandleSide[] = ["before", "after"];
const OTHER_SIDE: Readonly<Record<HandleSide, HandleSide>> = { before: "after", after: "before" };

function toPixels(offset: Offset, size: Size): Point {
	return { x: offset.x * size.width, y: offset.y * size.height };
}

function toUnit(pixels: Point, size: Size): Offset {
	return {
		x: size.width === 0 ? 0 : pixels.x / size.width,
		y: size.height === 0 ? 0 : pixels.y / size.height,
	};
}

function isZero(offset: Offset): boolean {
	return offset.x === 0 && offset.y === 0;
}

function handlePoint(vertex: Vertex, side: HandleSide): Offset {
	const handle = vertex[side];
	return { x: vertex.x + handle.x, y: vertex.y + handle.y };
}

function distance(one: Point, other: Point): number {
	return Math.hypot(one.x - other.x, one.y - other.y);
}

function partsOf(vertices: readonly Vertex[]): { part: PathPart; at: Offset }[] {
	const handles = vertices.flatMap((vertex, index) =>
		HANDLE_SIDES.flatMap((side) =>
			isZero(vertex[side]) ? [] : [{ part: { kind: side, index }, at: handlePoint(vertex, side) }],
		),
	);
	const places = vertices.map((vertex, index) => ({
		part: { kind: "vertex" as const, index },
		at: { x: vertex.x, y: vertex.y },
	}));
	return [...handles, ...places];
}

export function partAt(
	vertices: readonly Vertex[],
	size: Size,
	local: Point,
	reach: number,
): PathPart | null {
	let nearest: PathPart | null = null;
	let best = reach;
	for (const { part, at } of partsOf(vertices)) {
		const gap = distance(toPixels(at, size), local);
		if (gap <= best) {
			nearest = part;
			best = gap;
		}
	}
	return nearest;
}

function replaced(vertices: readonly Vertex[], index: number, vertex: Vertex): Vertex[] {
	return vertices.map((held, at) => (at === index ? vertex : held));
}

function mirrored(handle: Point, other: Point): Point {
	const length = Math.hypot(handle.x, handle.y);
	const reach = Math.hypot(other.x, other.y);
	if (length === 0 || reach === 0) {
		return other;
	}
	return { x: (-handle.x / length) * reach, y: (-handle.y / length) * reach };
}

function movedHandle(vertex: Vertex, side: HandleSide, handle: Point, size: Size): Vertex {
	const other = OTHER_SIDE[side];
	const opposite = mirrored(handle, toPixels(vertex[other], size));
	return { ...vertex, [side]: toUnit(handle, size), [other]: toUnit(opposite, size) };
}

export function movedPart(
	vertices: readonly Vertex[],
	part: PathPart,
	size: Size,
	shift: Point,
): Vertex[] {
	const vertex = vertices[part.index];
	if (vertex === undefined) {
		return [...vertices];
	}
	const unit = toUnit(shift, size);
	if (part.kind === "vertex") {
		return replaced(vertices, part.index, {
			...vertex,
			x: vertex.x + unit.x,
			y: vertex.y + unit.y,
		});
	}
	const handle = toPixels(vertex[part.kind], size);
	const moved = { x: handle.x + shift.x, y: handle.y + shift.y };
	return replaced(vertices, part.index, movedHandle(vertex, part.kind, moved, size));
}

function smoothed(vertices: readonly Vertex[], index: number, size: Size): Vertex | null {
	const count = vertices.length;
	const vertex = vertices[index];
	const previous = vertices[(index - 1 + count) % count];
	const next = vertices[(index + 1) % count];
	if (vertex === undefined || previous === undefined || next === undefined) {
		return null;
	}
	const at = toPixels(vertex, size);
	const from = toPixels(previous, size);
	const to = toPixels(next, size);
	const along = { x: to.x - from.x, y: to.y - from.y };
	const length = Math.hypot(along.x, along.y);
	if (length === 0) {
		return null;
	}
	const unit = { x: along.x / length, y: along.y / length };
	const back = distance(at, from) * SMOOTH_REACH;
	const ahead = distance(at, to) * SMOOTH_REACH;
	return {
		...vertex,
		before: toUnit({ x: -unit.x * back, y: -unit.y * back }, size),
		after: toUnit({ x: unit.x * ahead, y: unit.y * ahead }, size),
	};
}

export function toggledVertex(vertices: readonly Vertex[], index: number, size: Size): Vertex[] {
	const vertex = vertices[index];
	if (vertex === undefined) {
		return [...vertices];
	}
	const sharp = { ...vertex, before: NO_OFFSET, after: NO_OFFSET };
	const curved = !isZero(vertex.before) || !isZero(vertex.after);
	return replaced(vertices, index, curved ? sharp : (smoothed(vertices, index, size) ?? sharp));
}

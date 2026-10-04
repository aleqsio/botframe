import { bagOf, listOf } from "./bag";
import type { Bag } from "./bag";
import type { Geometry } from "./layer";
import type { Size } from "./length";

export interface Offset {
	x: number;
	y: number;
}

export interface Vertex extends Offset {
	before: Offset;
	after: Offset;
}

interface Corner {
	at: Offset;
	into: Offset;
	out: Offset;
}

export const NO_OFFSET: Offset = { x: 0, y: 0 };
const HALF: Offset = { x: 0.5, y: 0.5 };

// The control distance that draws a quarter circle with one cubic Bézier curve.
// https://spencermortensen.com/articles/bezier-circle/
const ARC_REACH = 0.5522847498;

const CORNERS: readonly Corner[] = [
	{ at: { x: 0, y: 0 }, into: { x: 0, y: -1 }, out: { x: 1, y: 0 } },
	{ at: { x: 1, y: 0 }, into: { x: 1, y: 0 }, out: { x: 0, y: 1 } },
	{ at: { x: 1, y: 1 }, into: { x: 0, y: 1 }, out: { x: -1, y: 0 } },
	{ at: { x: 0, y: 1 }, into: { x: -1, y: 0 }, out: { x: 0, y: -1 } },
];

function finite(bag: Bag, key: string): number | null {
	const value = bag[key];
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function offsetOf(value: unknown): Offset {
	const bag = bagOf(value);
	return { x: finite(bag, "x") ?? 0, y: finite(bag, "y") ?? 0 };
}

function vertexOf(value: unknown): Vertex[] {
	const bag = bagOf(value);
	const x = finite(bag, "x");
	const y = finite(bag, "y");
	if (x === null || y === null) {
		return [];
	}
	return [{ x, y, before: offsetOf(bag["before"]), after: offsetOf(bag["after"]) }];
}

export function verticesOf(value: unknown): readonly Vertex[] {
	return listOf(value).flatMap((vertex) => vertexOf(vertex));
}

function scaled(direction: Offset, reach: Offset): Offset {
	return { x: direction.x * reach.x, y: direction.y * reach.y };
}

function arcOf(corner: Corner, radius: Offset): Vertex[] {
	const into = scaled(corner.into, radius);
	const out = scaled(corner.out, radius);
	const handle = { x: radius.x * ARC_REACH, y: radius.y * ARC_REACH };
	const outHandle = scaled(corner.out, handle);
	return [
		{
			x: corner.at.x - into.x,
			y: corner.at.y - into.y,
			before: NO_OFFSET,
			after: scaled(corner.into, handle),
		},
		{
			x: corner.at.x + out.x,
			y: corner.at.y + out.y,
			before: { x: -outHandle.x, y: -outHandle.y },
			after: NO_OFFSET,
		},
	];
}

function samePlace(one: Offset, other: Offset): boolean {
	return one.x === other.x && one.y === other.y;
}

function joined(vertices: readonly Vertex[]): Vertex[] {
	const held: Vertex[] = [];
	for (const vertex of vertices) {
		const last = held.at(-1);
		if (last !== undefined && samePlace(last, vertex)) {
			held[held.length - 1] = { ...last, after: vertex.after };
		} else {
			held.push(vertex);
		}
	}
	const [first] = held;
	const last = held.at(-1);
	if (first !== undefined && last !== undefined && held.length > 1 && samePlace(first, last)) {
		held[0] = { ...first, before: last.before };
		held.pop();
	}
	return held;
}

function roundedVertices(radius: Offset): Vertex[] {
	return joined(CORNERS.flatMap((corner) => arcOf(corner, radius)));
}

function cornerRadius(pixels: number, size: Size): Offset {
	const held = Math.max(0, Math.min(pixels, size.width / 2, size.height / 2));
	return {
		x: size.width === 0 ? 0 : held / size.width,
		y: size.height === 0 ? 0 : held / size.height,
	};
}

export function outlineVertices(geometry: Geometry, size: Size): readonly Vertex[] | null {
	switch (geometry.kind) {
		case "rectangle": {
			return roundedVertices(cornerRadius(geometry.cornerRadius, size));
		}
		case "ellipse": {
			return roundedVertices(HALF);
		}
		case "path": {
			return geometry.vertices;
		}
		case "group":
		case "unsupported": {
			break;
		}
	}
	return null;
}

export function editableVertices(geometry: Geometry, size: Size): readonly Vertex[] | null {
	return geometry.kind === "rectangle" && geometry.frame ? null : outlineVertices(geometry, size);
}

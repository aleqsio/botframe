import type { Offset, Vertex } from "../document/vertices";

interface Segment {
	start: Offset;
	end: Offset;
	to: Offset;
	curved: boolean;
}

const PERCENT = 100;
const PLACES = 10_000;

function isZero(offset: Offset): boolean {
	return offset.x === 0 && offset.y === 0;
}

function plus(point: Offset, offset: Offset): Offset {
	return { x: point.x + offset.x, y: point.y + offset.y };
}

function segmentOf(from: Vertex, to: Vertex): Segment {
	return {
		start: plus(from, from.after),
		end: plus(to, to.before),
		to,
		curved: !isZero(from.after) || !isZero(to.before),
	};
}

function segmentsOf(vertices: readonly [Vertex, ...Vertex[]]): Segment[] {
	return vertices.map((vertex, index) =>
		segmentOf(vertex, vertices[(index + 1) % vertices.length] ?? vertex),
	);
}

function rounded(value: number): number {
	return Math.round(value * PLACES) / PLACES;
}

function percentOf(point: Offset): string {
	return `${rounded(point.x * PERCENT)}% ${rounded(point.y * PERCENT)}%`;
}

function shapeCommand(segment: Segment): string {
	const to = percentOf(segment.to);
	return segment.curved
		? `curve to ${to} with ${percentOf(segment.start)} / ${percentOf(segment.end)}`
		: `line to ${to}`;
}

export function shapeText(vertices: readonly Vertex[]): string | undefined {
	const [first, ...rest] = vertices;
	if (first === undefined) {
		return undefined;
	}
	const commands = segmentsOf([first, ...rest]).map((segment) => shapeCommand(segment));
	return `shape(from ${percentOf(first)}, ${commands.join(", ")}, close)`;
}

function pointText(point: Offset): string {
	return `${rounded(point.x)} ${rounded(point.y)}`;
}

function dataCommand(segment: Segment): string {
	const to = pointText(segment.to);
	return segment.curved
		? `C ${pointText(segment.start)} ${pointText(segment.end)} ${to}`
		: `L ${to}`;
}

export function pathData(vertices: readonly Vertex[]): string {
	const [first, ...rest] = vertices;
	if (first === undefined) {
		return "";
	}
	const commands = segmentsOf([first, ...rest]).map((segment) => dataCommand(segment));
	return `M ${pointText(first)} ${commands.join(" ")} Z`;
}

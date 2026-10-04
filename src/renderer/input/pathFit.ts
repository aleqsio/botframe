import type { Layer, LayerPatch, Rect } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Size } from "../../document/length";
import type { Offset, Vertex } from "../../document/vertices";
import type { Point } from "../state/camera";
import { anchoredPlace, outOfLayer } from "./layerSpace";
import { MIN_LAYER_SIZE, resizePatch } from "./transform";

type AxisKey = keyof Offset;

interface Cubic {
	start: number;
	pull: number;
	push: number;
	end: number;
}

interface AxisFit {
	low: number;
	extent: number;
}

interface FittedPath {
	box: Rect;
	vertices: Vertex[];
}

const FLAT = 1e-12;
const TOP_LEFT: Point = { x: 0, y: 0 };
const PLACES = 1_000_000;

function cubicAt(cubic: Cubic, time: number): number {
	const rest = 1 - time;
	return (
		rest * rest * rest * cubic.start +
		3 * rest * rest * time * cubic.pull +
		3 * rest * time * time * cubic.push +
		time * time * time * cubic.end
	);
}

function turningTimes(cubic: Cubic): number[] {
	const a = -cubic.start + 3 * cubic.pull - 3 * cubic.push + cubic.end;
	const b = 2 * (cubic.start - 2 * cubic.pull + cubic.push);
	const c = cubic.pull - cubic.start;
	if (Math.abs(a) < FLAT) {
		return Math.abs(b) < FLAT ? [] : [-c / b];
	}
	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) {
		return [];
	}
	const root = Math.sqrt(discriminant);
	return [(-b + root) / (2 * a), (-b - root) / (2 * a)];
}

function cubicValues(cubic: Cubic): number[] {
	const inside = turningTimes(cubic).filter((time) => time > 0 && time < 1);
	return [cubic.start, cubic.end, ...inside.map((time) => cubicAt(cubic, time))];
}

function cubicOf(from: Vertex, to: Vertex, axis: AxisKey): Cubic {
	return {
		start: from[axis],
		pull: from[axis] + from.after[axis],
		push: to[axis] + to.before[axis],
		end: to[axis],
	};
}

function axisValues(vertices: readonly Vertex[], axis: AxisKey): number[] {
	return vertices.flatMap((vertex, index) =>
		cubicValues(cubicOf(vertex, vertices[(index + 1) % vertices.length] ?? vertex, axis)),
	);
}

function axisFit(vertices: readonly Vertex[], axis: AxisKey, pixels: number): AxisFit {
	const values = axisValues(vertices, axis);
	const low = Math.min(...values);
	const extent = Math.max(...values) - low;
	return extent * pixels < MIN_LAYER_SIZE ? { low: 0, extent: 1 } : { low, extent };
}

function rounded(value: number): number {
	return Math.round(value * PLACES) / PLACES;
}

function fitOffset(offset: Offset, across: AxisFit, down: AxisFit): Offset {
	return { x: rounded(offset.x / across.extent), y: rounded(offset.y / down.extent) };
}

function fittedPath(vertices: readonly Vertex[], size: Size): FittedPath {
	const across = axisFit(vertices, "x", size.width);
	const down = axisFit(vertices, "y", size.height);
	return {
		box: {
			x: across.low * size.width,
			y: down.low * size.height,
			width: across.extent * size.width,
			height: down.extent * size.height,
		},
		vertices: vertices.map((vertex) => ({
			...fitOffset({ x: vertex.x - across.low, y: vertex.y - down.low }, across, down),
			before: fitOffset(vertex.before, across, down),
			after: fitOffset(vertex.after, across, down),
		})),
	};
}

export function fittedPatch(
	layer: Layer,
	parentDisplay: DisplayMode | null,
	vertices: readonly Vertex[],
): LayerPatch {
	const fitted = fittedPath(vertices, layer);
	const size = { width: fitted.box.width, height: fitted.box.height };
	const corner = outOfLayer(layer, fitted.box);
	const rect = { ...anchoredPlace({ ...layer, ...size }, TOP_LEFT, corner), ...size };
	return {
		...resizePatch(layer, parentDisplay, rect),
		geometry: { kind: "path", vertices: fitted.vertices },
	};
}

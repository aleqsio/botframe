import type { CSSProperties } from "react";
import { clipSourceOf } from "../document/clips";
import type { Layer, LayerId } from "../document/layer";
import { outlineVertices } from "../document/vertices";
import type { Offset, Vertex } from "../document/vertices";
import type { Point } from "./state/camera";
import { fromParentPoint, layerChain, toParentPoint } from "./input/layerSpace";
import type { ReadLayer } from "./input/layerSpace";
import { shapeText } from "./pathShape";

type MapPoint = (point: Point) => Point;

function plus(point: Offset, offset: Offset): Point {
	return { x: point.x + offset.x, y: point.y + offset.y };
}

function less(point: Point, origin: Point): Offset {
	return { x: point.x - origin.x, y: point.y - origin.y };
}

function mappedVertex(vertex: Vertex, map: MapPoint): Vertex {
	const at = map(vertex);
	return {
		...at,
		before: less(map(plus(vertex, vertex.before)), at),
		after: less(map(plus(vertex, vertex.after)), at),
	};
}

function sourceToTarget(read: ReadLayer, source: Layer, target: Layer): MapPoint | null {
	const from = layerChain(read, source.id);
	const into = layerChain(read, target.id);
	if (target.width === 0 || target.height === 0) {
		return null;
	}
	return (point) => {
		const local = { x: point.x * source.width, y: point.y * source.height };
		const there = toParentPoint(into, fromParentPoint(from, local));
		return { x: there.x / target.width, y: there.y / target.height };
	};
}

export function clipLinkIds(read: ReadLayer, target: Layer): LayerId[] {
	const source = clipSourceOf(read, target);
	const chains =
		source === null ? [] : [...layerChain(read, source.id), ...layerChain(read, target.id)];
	return chains.map((layer) => layer.id);
}

export function layerClipShape(read: ReadLayer, target: Layer): string | undefined {
	const source = clipSourceOf(read, target);
	const vertices = source === null ? null : outlineVertices(source.geometry, source);
	const map = source === null ? null : sourceToTarget(read, source, target);
	if (vertices === null || map === null) {
		return undefined;
	}
	return shapeText(vertices.map((vertex) => mappedVertex(vertex, map)));
}

export function withLayerClip(
	style: CSSProperties,
	shape: string | undefined,
	source: boolean,
): CSSProperties {
	const clipped = shape === undefined ? style : { ...style, clipPath: shape, overflow: undefined };
	return source ? { ...clipped, visibility: "hidden" } : clipped;
}

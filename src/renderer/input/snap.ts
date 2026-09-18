import type { Size } from "../../document/length";
import type { Guide, GuideAxis } from "../../document/layout";
import type { Point } from "../state/camera";

interface SnapTarget {
	axis: GuideAxis;
	at: number;
	other: number | null;
}

interface SnapMatch {
	delta: number;
	target: SnapTarget;
	point: Point;
}

export interface Snap {
	x: SnapMatch | null;
	y: SnapMatch | null;
}

export interface SnapField {
	x: readonly SnapTarget[];
	y: readonly SnapTarget[];
	span: Size | null;
}

export interface SnapSegment {
	axis: GuideAxis;
	at: number;
	from: number;
	to: number;
}

export const SNAP_REACH = 8;

const AXES: readonly GuideAxis[] = ["x", "y"];

function otherAxis(axis: GuideAxis): GuideAxis {
	return axis === "x" ? "y" : "x";
}

function byPosition(first: SnapTarget, second: SnapTarget): number {
	return first.at - second.at;
}

function pointTargets(points: readonly Point[], axis: GuideAxis): SnapTarget[] {
	const other = otherAxis(axis);
	return points.map((point) => ({ axis, at: point[axis], other: point[other] }));
}

function lineTargets(span: Size, guides: readonly Guide[], axis: GuideAxis): SnapTarget[] {
	const extent = axis === "x" ? span.width : span.height;
	const edges = [0, extent / 2, extent].map((at) => ({ axis, at, other: null }));
	const lines = guides.flatMap((guide) => (guide.axis === axis ? [{ ...guide, other: null }] : []));
	return [...edges, ...lines];
}

export interface FieldSpec {
	points: readonly Point[];
	container: { span: Size; guides: readonly Guide[] } | null;
}

function targetsOf(spec: FieldSpec, axis: GuideAxis): SnapTarget[] {
	const lines =
		spec.container === null ? [] : lineTargets(spec.container.span, spec.container.guides, axis);
	return [...pointTargets(spec.points, axis), ...lines].toSorted(byPosition);
}

export function snapFieldOf(spec: FieldSpec): SnapField {
	return {
		x: targetsOf(spec, "x"),
		y: targetsOf(spec, "y"),
		span: spec.container?.span ?? null,
	};
}

function nearestIndex(sorted: readonly SnapTarget[], value: number): number {
	let low = 0;
	let high = sorted.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if ((sorted[middle]?.at ?? Number.POSITIVE_INFINITY) < value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	const above = sorted[low];
	const below = sorted[low - 1];
	if (above === undefined || below === undefined) {
		return above === undefined ? low - 1 : low;
	}
	return above.at - value < value - below.at ? low : low - 1;
}

function otherGap(target: SnapTarget, other: number): number {
	return target.other === null ? Number.POSITIVE_INFINITY : Math.abs(target.other - other);
}

function firstEqual(sorted: readonly SnapTarget[], index: number, at: number): number {
	let start = index;
	while (start > 0 && sorted[start - 1]?.at === at) {
		start -= 1;
	}
	return start;
}

function nearestTarget(
	sorted: readonly SnapTarget[],
	point: Point,
	axis: GuideAxis,
): SnapTarget | null {
	const nearest = nearestIndex(sorted, point[axis]);
	const found = sorted[nearest];
	if (found === undefined) {
		return null;
	}
	const other = point[otherAxis(axis)];
	let best = found;
	for (let index = firstEqual(sorted, nearest, found.at); index < sorted.length; index += 1) {
		const held = sorted[index];
		if (held === undefined || held.at !== found.at) {
			break;
		}
		best = otherGap(held, other) < otherGap(best, other) ? held : best;
	}
	return best;
}

function matchAlong(
	sorted: readonly SnapTarget[],
	axis: GuideAxis,
	points: readonly Point[],
	reach: number,
): SnapMatch | null {
	let best: SnapMatch | null = null;
	for (const point of points) {
		const target = nearestTarget(sorted, point, axis);
		if (target === null) {
			continue;
		}
		const next = { delta: target.at - point[axis], target, point };
		if (
			Math.abs(next.delta) <= reach &&
			(best === null || Math.abs(next.delta) < Math.abs(best.delta))
		) {
			best = next;
		}
	}
	return best;
}

export function snapTo(field: SnapField, points: readonly Point[], reach: number): Snap {
	return { x: matchAlong(field.x, "x", points, reach), y: matchAlong(field.y, "y", points, reach) };
}

export function snappedPoint(wanted: Point, snap: Snap): Point {
	return { x: wanted.x + (snap.x?.delta ?? 0), y: wanted.y + (snap.y?.delta ?? 0) };
}

function spanAlong(span: Size | null, axis: GuideAxis): number {
	if (span === null) {
		return 0;
	}
	return axis === "x" ? span.height : span.width;
}

function segmentOf(snap: Snap, span: Size | null, axis: GuideAxis): SnapSegment | null {
	const match = snap[axis];
	if (match === null) {
		return null;
	}
	const other = otherAxis(axis);
	const reached = match.point[other] + (snap[other]?.delta ?? 0);
	const target = match.target.other;
	if (target === null) {
		return { axis, at: match.target.at, from: 0, to: spanAlong(span, axis) };
	}
	return {
		axis,
		at: match.target.at,
		from: Math.min(reached, target),
		to: Math.max(reached, target),
	};
}

export function snapSegmentsOf(snap: Snap, span: Size | null): SnapSegment[] {
	return AXES.flatMap((axis) => segmentOf(snap, span, axis) ?? []);
}

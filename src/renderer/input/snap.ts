import type { Size } from "../../document/length";
import type { Guide, GuideAxis } from "../../document/layout";
import type { Point } from "../state/camera";

type SnapAxis = GuideAxis;

interface SnapTarget {
	axis: SnapAxis;
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
	axis: SnapAxis;
	at: number;
	from: number;
	to: number;
}

export const SNAP_REACH = 8;

const AXES: readonly SnapAxis[] = ["x", "y"];

function otherAxis(axis: SnapAxis): SnapAxis {
	return axis === "x" ? "y" : "x";
}

function byPosition(first: SnapTarget, second: SnapTarget): number {
	return first.at - second.at;
}

function pointTargets(points: readonly Point[], axis: SnapAxis): SnapTarget[] {
	const other = otherAxis(axis);
	return points.map((point) => ({ axis, at: point[axis], other: point[other] }));
}

function lineTargets(span: Size, guides: readonly Guide[], axis: SnapAxis): SnapTarget[] {
	const extent = axis === "x" ? span.width : span.height;
	const edges = [0, extent / 2, extent].map((at) => ({ axis, at, other: null }));
	const lines = guides.flatMap((guide) => (guide.axis === axis ? [{ ...guide, other: null }] : []));
	return [...edges, ...lines];
}

export interface FieldSpec {
	points: readonly Point[];
	container: { span: Size; guides: readonly Guide[] } | null;
}

function targetsOf(spec: FieldSpec, axis: SnapAxis): SnapTarget[] {
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
	axis: SnapAxis,
): SnapTarget | null {
	const nearest = nearestIndex(sorted, point[axis]);
	const found = sorted[nearest];
	if (found === undefined) {
		return null;
	}
	const other = point[otherAxis(axis)];
	let best = found;
	for (let index = firstEqual(sorted, nearest, found.at); ; index += 1) {
		const held = sorted[index];
		if (held === undefined || held.at !== found.at) {
			return best;
		}
		best = otherGap(held, other) < otherGap(best, other) ? held : best;
	}
}

function closer(held: SnapMatch | null, next: SnapMatch): boolean {
	return held === null || Math.abs(next.delta) < Math.abs(held.delta);
}

interface Along {
	field: SnapField;
	axis: SnapAxis;
	reach: number;
}

function matchAlong(along: Along, points: readonly Point[]): SnapMatch | null {
	let best: SnapMatch | null = null;
	for (const point of points) {
		const target = nearestTarget(along.field[along.axis], point, along.axis);
		if (target === null) {
			continue;
		}
		const next = { delta: target.at - point[along.axis], target, point };
		if (Math.abs(next.delta) <= along.reach && closer(best, next)) {
			best = next;
		}
	}
	return best;
}

export function snapTo(field: SnapField, points: readonly Point[], reach: number): Snap {
	return {
		x: matchAlong({ field, axis: "x", reach }, points),
		y: matchAlong({ field, axis: "y", reach }, points),
	};
}

export function snappedPoint(wanted: Point, snap: Snap): Point {
	return { x: wanted.x + (snap.x?.delta ?? 0), y: wanted.y + (snap.y?.delta ?? 0) };
}

function spanAlong(span: Size | null, axis: SnapAxis): number {
	if (span === null) {
		return 0;
	}
	return axis === "x" ? span.height : span.width;
}

function segmentOf(snap: Snap, span: Size | null, axis: SnapAxis): SnapSegment | null {
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

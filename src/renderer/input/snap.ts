import type { Size } from "../../document/length";
import type { Guide, GuideAxis } from "../../document/layout";
import type { Point } from "../state/camera";
import { normalizeDegrees, rotatePoint } from "./layerSpace";
import type { Curve } from "./snapShape";

type SegmentCurve = Extract<Curve, { kind: "segment" }>;
type ArcCurve = Extract<Curve, { kind: "arc" }>;

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

interface BoundedCurve {
	curve: Curve;
	min: Point;
	max: Point;
}

export interface Snap {
	x: SnapMatch | null;
	y: SnapMatch | null;
}

export interface SnapField {
	x: readonly SnapTarget[];
	y: readonly SnapTarget[];
	curves: readonly BoundedCurve[];
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
const STRAIGHT_ANGLE = 180;
const FULL_TURN = 360;

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
	curves: readonly Curve[];
	container: { span: Size; guides: readonly Guide[] } | null;
}

function targetsOf(spec: FieldSpec, axis: GuideAxis): SnapTarget[] {
	const lines =
		spec.container === null ? [] : lineTargets(spec.container.span, spec.container.guides, axis);
	return [...pointTargets(spec.points, axis), ...lines].toSorted(byPosition);
}

function armsOf(curve: ArcCurve): { cos: Point; sin: Point } {
	return {
		cos: rotatePoint({ x: curve.radii.x, y: 0 }, curve.turn),
		sin: rotatePoint({ x: 0, y: curve.radii.y }, curve.turn),
	};
}

function boundsOf(curve: Curve): BoundedCurve {
	if (curve.kind === "segment") {
		return {
			curve,
			min: { x: Math.min(curve.from.x, curve.to.x), y: Math.min(curve.from.y, curve.to.y) },
			max: { x: Math.max(curve.from.x, curve.to.x), y: Math.max(curve.from.y, curve.to.y) },
		};
	}
	const arms = armsOf(curve);
	const reachX = Math.abs(arms.cos.x) + Math.abs(arms.sin.x);
	const reachY = Math.abs(arms.cos.y) + Math.abs(arms.sin.y);
	return {
		curve,
		min: { x: curve.center.x - reachX, y: curve.center.y - reachY },
		max: { x: curve.center.x + reachX, y: curve.center.y + reachY },
	};
}

export function snapFieldOf(spec: FieldSpec): SnapField {
	return {
		x: targetsOf(spec, "x"),
		y: targetsOf(spec, "y"),
		curves: spec.curves.map(boundsOf),
		span: spec.container?.span ?? null,
	};
}

function segmentCrossings(curve: SegmentCurve, axis: GuideAxis, other: number): number[] {
	const across = otherAxis(axis);
	const run = curve.to[across] - curve.from[across];
	if (run === 0) {
		return [];
	}
	const along = (other - curve.from[across]) / run;
	if (along < 0 || along > 1) {
		return [];
	}
	return [curve.from[axis] + along * (curve.to[axis] - curve.from[axis])];
}

function withinSweep(curve: ArcCurve, radians: number): boolean {
	const sweep = curve.to - curve.from;
	const degrees = (radians * STRAIGHT_ANGLE) / Math.PI;
	return sweep >= FULL_TURN || normalizeDegrees(degrees - curve.from) <= sweep;
}

function arcCrossings(curve: ArcCurve, axis: GuideAxis, other: number): number[] {
	const across = otherAxis(axis);
	const arms = armsOf(curve);
	const radius = Math.hypot(arms.cos[across], arms.sin[across]);
	const gap = other - curve.center[across];
	if (radius === 0 || Math.abs(gap) > radius) {
		return [];
	}
	const middle = Math.atan2(arms.sin[across], arms.cos[across]);
	const offset = Math.acos(gap / radius);
	return [middle - offset, middle + offset]
		.filter((angle) => withinSweep(curve, angle))
		.map(
			(angle) =>
				curve.center[axis] + arms.cos[axis] * Math.cos(angle) + arms.sin[axis] * Math.sin(angle),
		);
}

export function crossingsOf(curve: Curve, axis: GuideAxis, other: number): number[] {
	return curve.kind === "segment"
		? segmentCrossings(curve, axis, other)
		: arcCrossings(curve, axis, other);
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

function withinBox(bounded: BoundedCurve, axis: GuideAxis, point: Point, reach: number): boolean {
	const across = otherAxis(axis);
	if (point[across] < bounded.min[across] || point[across] > bounded.max[across]) {
		return false;
	}
	return point[axis] >= bounded.min[axis] - reach && point[axis] <= bounded.max[axis] + reach;
}

function curveTargets(
	curves: readonly BoundedCurve[],
	axis: GuideAxis,
	point: Point,
	reach: number,
): SnapTarget[] {
	const other = point[otherAxis(axis)];
	return curves.flatMap((bounded) =>
		withinBox(bounded, axis, point, reach)
			? crossingsOf(bounded.curve, axis, other).map((at) => ({ axis, at, other }))
			: [],
	);
}

function targetsFor(field: SnapField, axis: GuideAxis, point: Point, reach: number): SnapTarget[] {
	const nearest = nearestTarget(field[axis], point, axis);
	const curves = curveTargets(field.curves, axis, point, reach);
	return nearest === null ? curves : [nearest, ...curves];
}

function matchAlong(
	field: SnapField,
	axis: GuideAxis,
	points: readonly Point[],
	reach: number,
): SnapMatch | null {
	let best: SnapMatch | null = null;
	for (const point of points) {
		for (const target of targetsFor(field, axis, point, reach)) {
			const delta = target.at - point[axis];
			if (Math.abs(delta) <= reach && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
				best = { delta, target, point };
			}
		}
	}
	return best;
}

export function snapTo(field: SnapField, points: readonly Point[], reach: number): Snap {
	return { x: matchAlong(field, "x", points, reach), y: matchAlong(field, "y", points, reach) };
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

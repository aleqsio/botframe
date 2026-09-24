import type { DesignDocument } from "../../document/document";
import type { GuideAxis } from "../../document/guides";
import { CENTER_ORIGIN, isCenterOrigin } from "../../document/layer";
import type { Layer, LayerPatch, Origin, Pose } from "../../document/layer";
import type { LayoutPatch } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import {
	normalizeDegrees,
	parentChain,
	placedAround,
	poseInside,
	seenLinear,
	visualCenterOf,
} from "./layerSpace";
import type { ReadLayer } from "./layerSpace";
import { HALF_TURN, linearOf, multiplyLinear } from "./linear";
import { SIZE_ALONG } from "./layoutGeometry";
import {
	TRACKS_ALONG,
	holdsMirror,
	mirroredCell,
	mirroredGuides,
	mirroredLayout,
	reversesOrder,
	swappedSides,
} from "./flipLayout";

export interface FlipScope {
	doc: DesignDocument;
	read: ReadLayer;
}

interface FlipPlan {
	pose: Pose;
	axis: GuideAxis | null;
}

const AXIS_MIRRORS: Readonly<Record<GuideAxis, Pose>> = {
	x: { rotation: 0, skewX: 0, skewY: 0, mirrored: true },
	y: { rotation: HALF_TURN, skewX: 0, skewY: 0, mirrored: true },
};
const SAME_TURN = 1e-9;
const ORIGIN_PLACES = 1e9;

export function childrenOf(doc: DesignDocument, parent: Layer): Layer[] {
	return doc.childIds(parent.id).flatMap((id) => doc.layer(id) ?? []);
}

function inFlow(parent: Layer, child: Layer): boolean {
	return !outOfFlow(parent.layout.display, child.layout.position);
}

function holdsInFlow(scope: FlipScope, child: Layer): boolean {
	return isCenterOrigin(child.origin) || (!child.mirrored && canBake(scope, child));
}

function canBake(scope: FlipScope, layer: Layer): boolean {
	const { kind } = layer.geometry;
	if (kind !== "rectangle" && kind !== "ellipse") {
		return false;
	}
	const flow = childrenOf(scope.doc, layer).filter((child) => inFlow(layer, child));
	return (
		holdsMirror(
			layer.layout,
			flow.map((child) => child.layout.cell),
		) && flow.every((child) => holdsInFlow(scope, child))
	);
}

function otherSide(fraction: number): number {
	return Math.round((1 - fraction) * ORIGIN_PLACES) / ORIGIN_PLACES;
}

function flippedOrigin(origin: Origin, axis: GuideAxis): Partial<Origin> {
	return axis === "x" ? { x: otherSide(origin.x) } : { y: otherSide(origin.y) };
}

function turnGap(one: number, other: number): number {
	const gap = normalizeDegrees(one - other);
	return Math.min(gap, 2 * HALF_TURN - gap);
}

function bakedTurn(target: Pose, axis: GuideAxis): number {
	return normalizeDegrees(target.rotation + (axis === "y" ? HALF_TURN : 0));
}

function nearestAxis(target: Pose, rotation: number): GuideAxis {
	const alongX = turnGap(bakedTurn(target, "x"), rotation);
	return alongX <= turnGap(bakedTurn(target, "y"), rotation) ? "x" : "y";
}

function mirroredPose(pose: Pose, axis: GuideAxis): Pose {
	return {
		rotation: normalizeDegrees(AXIS_MIRRORS[axis].rotation - pose.rotation),
		skewX: -pose.skewX + 0,
		skewY: -pose.skewY + 0,
		mirrored: !pose.mirrored,
	};
}

function screenPose(parents: readonly Pose[], layer: Pose, axes: readonly GuideAxis[]): Pose {
	const seen = axes.reduce(
		(linear, axis) => multiplyLinear(linearOf(AXIS_MIRRORS[axis]), linear),
		seenLinear(parents, layer),
	);
	const near = axes.reduce((pose, axis) => mirroredPose(pose, axis), layer);
	return poseInside(parents, seen, near);
}

function planOf(scope: FlipScope, layer: Layer, axes: readonly GuideAxis[]): FlipPlan {
	const target = screenPose(parentChain(scope.read, layer.id), layer, axes);
	if (!target.mirrored || layer.mirrored || !canBake(scope, layer)) {
		return { pose: target, axis: null };
	}
	const axis = nearestAxis(target, layer.rotation);
	return { pose: { ...target, rotation: bakedTurn(target, axis), mirrored: false }, axis };
}

function reverseFlow({ doc }: FlipScope, parent: Layer, children: readonly Layer[]): void {
	const flow = children.filter((child) => inFlow(parent, child));
	const slots = new Map(flow.map((child, index) => [child.id, flow.length - 1 - index]));
	const order = children.map((child) => flow[slots.get(child.id) ?? -1] ?? child);
	for (const [index, child] of order.entries()) {
		if (doc.childIds(parent.id)[index] !== child.id) {
			doc.move(child.id, parent.id, index);
		}
	}
}

function childLayout(parent: Layer, child: Layer, axis: GuideAxis): LayoutPatch {
	const margin = swappedSides(child.layout.margin, axis);
	if (parent.layout.display !== "grid") {
		return { margin };
	}
	const tracks = parent.layout.tracks[TRACKS_ALONG[axis]].length;
	return { margin, cell: mirroredCell(child.layout.cell, axis, tracks) };
}

function turnedChild(scope: FlipScope, child: Layer, axis: GuideAxis): LayerPatch {
	if (child.mirrored || !canBake(scope, child)) {
		return mirroredPose(child, axis);
	}
	bakeContent(scope, child, axis);
	const origin = flippedOrigin(child.origin, axis);
	const rotation = normalizeDegrees(-child.rotation);
	const skews = { skewX: -child.skewX + 0, skewY: -child.skewY + 0 };
	return { rotation, ...skews, mirrored: false, origin };
}

function mirrorChild(scope: FlipScope, parent: Layer, child: Layer, axis: GuideAxis): void {
	const turned = turnedChild(scope, child, axis);
	const layout = childLayout(parent, child, axis);
	const place = placeAfter(scope, { parent, child, axis }, turned);
	scope.doc.update(child.id, { ...turned, ...place, layout });
}

interface Mirroring {
	parent: Layer;
	child: Layer;
	axis: GuideAxis;
}

function placeAfter(
	scope: FlipScope,
	{ parent, child, axis }: Mirroring,
	turned: LayerPatch,
): LayerPatch {
	if (inFlow(parent, child)) {
		return child.layout.position === "offset" ? { [axis]: -child[axis] } : {};
	}
	const size = (scope.read(parent.id) ?? parent)[SIZE_ALONG[axis]];
	const shown = scope.read(child.id) ?? child;
	const center = visualCenterOf(shown);
	const mirrored = { ...center, [axis]: size - center[axis] };
	const origin = { ...shown.origin, ...turned.origin };
	const place = placedAround({ ...shown, ...turned, origin }, mirrored);
	return { [axis]: place[axis] };
}

function bakeContent(scope: FlipScope, layer: Layer, axis: GuideAxis): void {
	const children = childrenOf(scope.doc, layer);
	const size = (scope.read(layer.id) ?? layer)[SIZE_ALONG[axis]];
	const guides =
		layer.guides.length === 0 ? {} : { guides: mirroredGuides(layer.guides, axis, size) };
	scope.doc.update(layer.id, { layout: mirroredLayout(layer.layout, axis), ...guides });
	for (const child of children) {
		mirrorChild(scope, layer, child, axis);
	}
	if (reversesOrder(layer.layout, axis)) {
		reverseFlow(scope, layer, children);
	}
}

export function flipLayer(scope: FlipScope, layer: Layer, axes: readonly GuideAxis[]): void {
	const { pose, axis } = planOf(scope, layer, axes);
	if (axis === null) {
		scope.doc.update(layer.id, pose);
		return;
	}
	bakeContent(scope, layer, axis);
	scope.doc.update(layer.id, { ...pose, origin: flippedOrigin(layer.origin, axis) });
}

export function flipKeeps(scope: FlipScope, layer: Layer, axes: readonly GuideAxis[]): boolean {
	if (layer.guides.length > 0 || scope.doc.childIds(layer.id).length > 0) {
		return false;
	}
	const { pose, axis } = planOf(scope, layer, axes);
	return (
		axis !== null &&
		turnGap(pose.rotation, layer.rotation) < SAME_TURN &&
		Math.abs(pose.skewX - layer.skewX) < SAME_TURN &&
		Math.abs(pose.skewY - layer.skewY) < SAME_TURN &&
		layer.origin[axis] === CENTER_ORIGIN[axis]
	);
}

import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove, UserState } from "../state/userState";
import { dropParentOf, heldPlacement } from "./dropTarget";
import { COMMIT_MESSAGES } from "./layerCommand";
import { isLaidOut, settleInLayout } from "./layoutDrag";
import type { Modifiers } from "./modifiers";
import { SNAP_REACH, snapSegmentsOf, snapTo, snappedPoint } from "./snap";
import { snapFieldAround } from "./snapField";
import { snapShapeOf } from "./snapShape";
import { parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const CANCEL_COMMIT = "cancel move";

function parentUnder(target: PointerTarget, move: LayerMove, point: StagePoint): LayerId | null {
	return dropParentOf(target.layerIdsAt(point), (id) => target.doc.layer(id), move.id);
}

function offsetOf(target: PointerTarget, layer: Layer, canvas: Point): Point {
	const origin = parentPointOf(target, layer.id, canvas);
	return { x: origin.x - layer.x, y: origin.y - layer.y };
}

function retarget(target: PointerTarget, move: LayerMove, point: StagePoint): LayerMove {
	const parent = parentUnder(target, move, point);
	const layer = target.doc.layer(move.id);
	if (parent === move.parent || layer === null) {
		return move;
	}
	const from = parentChainOf(target, move.id);
	if (!target.doc.move(move.id, parent)) {
		return move;
	}
	const moved = target.doc.layer(move.id) ?? layer;
	const placement = heldPlacement(layer, from, parentChainOf(target, move.id), moved);
	target.doc.update(move.id, placement);
	const offset = offsetOf(target, { ...moved, ...placement, parent }, point.canvas);
	const next = { ...move, parent, offset, field: snapFieldAround(target, move.id) };
	target.user.move.set(next);
	return next;
}

function snappedPlace(target: PointerTarget, move: LayerMove, layer: Layer, wanted: Point): Point {
	const reach = SNAP_REACH / target.user.camera.get().zoom;
	const snap = snapTo(move.field, snapShapeOf({ ...layer, ...wanted }).points, reach);
	const segments = snapSegmentsOf(snap, move.field.span);
	target.user.snap.set(segments.length === 0 ? null : { parent: layer.parent, segments });
	return snappedPoint(wanted, snap);
}

function carryLayer(
	target: PointerTarget,
	move: LayerMove,
	canvas: Point,
	modifiers: Modifiers,
): void {
	const point = parentPointOf(target, move.id, canvas);
	const wanted = { x: point.x - move.offset.x, y: point.y - move.offset.y };
	if (modifiers.control) {
		target.user.snap.set(null);
		target.doc.update(move.id, wanted);
		return;
	}
	const layer = target.doc.layer(move.id);
	if (layer === null) {
		return;
	}
	target.doc.update(move.id, snappedPlace(target, move, layer, wanted));
}

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	target.user.move.set({
		id: layer.id,
		from: layer.parent,
		index: target.doc.siblingIds(layer.parent).indexOf(layer.id),
		parent: layer.parent,
		start: {
			rotation: layer.rotation,
			cell: layer.cell,
			lengths: { x: layer.lengths.x, y: layer.lengths.y },
		},
		offset: offsetOf(target, layer, canvas),
		field: snapFieldAround(target, layer.id),
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	const move = target.user.move.get();
	if (move === null) {
		return;
	}
	if (!isLaidOut(target, move.parent)) {
		carryLayer(target, move, point.canvas, modifiers);
	}
	const held = retarget(target, move, point);
	if (isLaidOut(target, held.parent)) {
		target.user.snap.set(null);
		settleInLayout(target, held.id, point.canvas);
	}
}

export function finishMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	if (target.user.move.get() === null) {
		return;
	}
	applyMove(target, point, modifiers);
	target.user.move.set(null);
	target.user.snap.set(null);
	target.doc.commit(COMMIT_MESSAGES.move);
}

export function changesParent(move: LayerMove | null): boolean {
	return move !== null && move.parent !== move.from;
}

export function cancelMove(doc: DesignDocument, user: UserState): void {
	const move = user.move.get();
	if (move === null) {
		return;
	}
	user.move.set(null);
	user.snap.set(null);
	doc.move(move.id, move.from, move.index);
	doc.update(move.id, move.start);
	doc.commit(CANCEL_COMMIT);
}

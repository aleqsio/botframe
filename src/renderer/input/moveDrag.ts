import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove, UserState } from "../state/userState";
import { dropParentOf, heldPlacement } from "./dropTarget";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { carryLayer } from "./moveCarry";
import { snapFieldAround } from "./snapField";
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

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	target.user.move.set({
		id: layer.id,
		from: layer.parent,
		parent: layer.parent,
		start: {
			x: layer.x,
			y: layer.y,
			rotation: layer.rotation,
			position: layer.layout.position,
			cell: layer.layout.cell,
			index: target.doc.siblingIds(layer.parent).indexOf(layer.id),
		},
		offset: offsetOf(target, layer, canvas),
		field: snapFieldAround(target, layer.id),
		lift: null,
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	const move = target.user.move.get();
	if (move === null) {
		return;
	}
	carryLayer(target, move, point, modifiers);
	retarget(target, move, point);
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
	doc.move(move.id, move.from, move.start.index);
	const { x, y, rotation, position, cell } = move.start;
	doc.update(move.id, { x, y, rotation, layout: { position, cell } });
	doc.commit(CANCEL_COMMIT);
}

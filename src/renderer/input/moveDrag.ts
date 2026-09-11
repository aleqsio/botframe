import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove, UserState } from "../state/userState";
import { dropParentOf, heldOffset } from "./dropTarget";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const CANCEL_COMMIT = "cancel move";

function parentUnder(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	alt: boolean,
): LayerId | null {
	return dropParentOf(target.layerIdsAt(point), (id) => target.doc.layer(id), move.id, alt);
}

function retarget(
	target: PointerTarget,
	move: LayerMove,
	point: StagePoint,
	alt: boolean,
): LayerMove {
	const parent = parentUnder(target, move, point, alt);
	if (parent === move.parent) {
		return move;
	}
	const from = parentChainOf(target, move.id);
	if (!target.doc.move(move.id, parent)) {
		return move;
	}
	const offset = heldOffset(from, parentChainOf(target, move.id), move.offset);
	const next: LayerMove = { ...move, parent, offset };
	target.user.move.set(next);
	return next;
}

function carryLayer(target: PointerTarget, move: LayerMove, canvas: Point): void {
	const point = parentPointOf(target, move.id, canvas);
	target.doc.update(move.id, { x: point.x - move.offset.x, y: point.y - move.offset.y });
}

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	const origin = parentPointOf(target, layer.id, canvas);
	target.user.move.set({
		id: layer.id,
		from: layer.parent,
		parent: layer.parent,
		start: { x: layer.x, y: layer.y },
		offset: { x: origin.x - layer.x, y: origin.y - layer.y },
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	const move = target.user.move.get();
	if (move === null) {
		return;
	}
	carryLayer(target, retarget(target, move, point, modifiers.alt), point.canvas);
}

export function finishMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	if (target.user.move.get() === null) {
		return;
	}
	applyMove(target, point, modifiers);
	target.user.move.set(null);
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
	doc.move(move.id, move.from);
	doc.update(move.id, move.start);
	doc.commit(CANCEL_COMMIT);
}

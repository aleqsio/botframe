import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove, UserState } from "../state/userState";
import { dropParentOf, heldPlacement } from "./dropTarget";
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

function offsetOf(target: PointerTarget, layer: Layer, canvas: Point): Point {
	const origin = parentPointOf(target, layer.id, canvas);
	return { x: origin.x - layer.x, y: origin.y - layer.y };
}

function retarget(target: PointerTarget, move: LayerMove, point: StagePoint, alt: boolean): void {
	const parent = parentUnder(target, move, point, alt);
	const layer = target.doc.layer(move.id);
	if (parent === move.parent || layer === null) {
		return;
	}
	const from = parentChainOf(target, move.id);
	if (!target.doc.move(move.id, parent)) {
		return;
	}
	const placement = heldPlacement(layer, from, parentChainOf(target, move.id));
	target.doc.update(move.id, placement);
	const offset = offsetOf(target, { ...layer, ...placement, parent }, point.canvas);
	target.user.move.set({ ...move, parent, offset });
}

function carryLayer(target: PointerTarget, move: LayerMove, canvas: Point): void {
	const point = parentPointOf(target, move.id, canvas);
	target.doc.update(move.id, { x: point.x - move.offset.x, y: point.y - move.offset.y });
}

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	target.user.move.set({
		id: layer.id,
		from: layer.parent,
		parent: layer.parent,
		start: { x: layer.x, y: layer.y, rotation: layer.rotation },
		offset: offsetOf(target, layer, canvas),
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	const move = target.user.move.get();
	if (move === null) {
		return;
	}
	carryLayer(target, move, point.canvas);
	retarget(target, move, point, modifiers.alt);
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

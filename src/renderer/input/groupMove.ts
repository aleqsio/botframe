import type { DesignDocument } from "../../document/document";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { shiftBy } from "./affine";
import { groupOf, placeGroup } from "./group";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { PointerTarget } from "./tool";

export const CANCEL_COMMIT = "cancel move";

export function pressesGroup(target: PointerTarget): boolean {
	const [hit] = target.layerIds;
	const selection = target.user.selection.get();
	return hit !== undefined && selection.length > 1 && selection.includes(hit);
}

export function beginGroupMove(target: PointerTarget, canvas: Point): boolean {
	const group = groupOf(target);
	if (group === null) {
		return false;
	}
	target.user.groupMove.set({ group, grab: canvas });
	return true;
}

export function applyGroupMove(target: PointerTarget, point: StagePoint): void {
	const move = target.user.groupMove.get();
	if (move === null) {
		return;
	}
	const delta = { x: point.canvas.x - move.grab.x, y: point.canvas.y - move.grab.y };
	placeGroup(target, move.group, shiftBy(delta), "move");
}

export function finishGroupMove(target: PointerTarget, point: StagePoint): void {
	if (target.user.groupMove.get() === null) {
		return;
	}
	applyGroupMove(target, point);
	target.user.groupMove.set(null);
	target.doc.commit(COMMIT_MESSAGES.move);
}

export function cancelGroupMove(doc: DesignDocument, user: UserState): void {
	const move = user.groupMove.get();
	if (move === null) {
		return;
	}
	user.groupMove.set(null);
	for (const { layer } of move.group.layers) {
		doc.update(layer.id, { x: layer.x, y: layer.y });
	}
	doc.commit(CANCEL_COMMIT);
}

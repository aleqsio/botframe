import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import type { GroupStart, UserState } from "../state/userState";
import { COMMIT_MESSAGES } from "./layerCommand";
import { freeAxesOf, placedOn } from "./snapAxes";
import { parentDisplayOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const CANCEL_COMMIT = "cancel move";
const SMALLEST_GROUP = 2;

function startsOf(target: PointerTarget, ids: readonly LayerId[]): readonly GroupStart[] {
	return ids.flatMap((id) => {
		const layer = target.doc.layer(id);
		return layer === null ? [] : [{ id, x: layer.x, y: layer.y }];
	});
}

export function beginGroupMove(target: PointerTarget, canvas: Point): boolean {
	const starts = startsOf(target, target.user.selection.get());
	if (starts.length < SMALLEST_GROUP) {
		return false;
	}
	target.user.group.set({ origin: canvas, starts });
	return true;
}

function shiftStart(target: PointerTarget, start: GroupStart, origin: Point, canvas: Point): void {
	const layer = target.doc.layer(start.id);
	if (layer === null) {
		return;
	}
	const axes = freeAxesOf(parentDisplayOf(target, layer), layer.layout.position);
	if (axes.length === 0) {
		return;
	}
	const from = parentPointOf(target, start.id, origin);
	const to = parentPointOf(target, start.id, canvas);
	target.doc.update(
		start.id,
		placedOn(axes, { x: start.x + to.x - from.x, y: start.y + to.y - from.y }),
	);
}

export function applyGroupMove(target: PointerTarget, canvas: Point): void {
	const group = target.user.group.get();
	if (group === null) {
		return;
	}
	for (const start of group.starts) {
		shiftStart(target, start, group.origin, canvas);
	}
}

export function finishGroupMove(target: PointerTarget, canvas: Point): void {
	if (target.user.group.get() === null) {
		return;
	}
	applyGroupMove(target, canvas);
	target.user.group.set(null);
	target.doc.commit(COMMIT_MESSAGES.move);
}

export function cancelGroupMove(doc: DesignDocument, user: UserState): void {
	const group = user.group.get();
	if (group === null) {
		return;
	}
	user.group.set(null);
	for (const start of group.starts) {
		doc.update(start.id, { x: start.x, y: start.y });
	}
	doc.commit(CANCEL_COMMIT);
}

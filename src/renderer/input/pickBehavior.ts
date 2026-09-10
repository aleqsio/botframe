import type { LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { COMMIT_MESSAGES } from "./layerCommand";
import { parentPointOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

interface Move {
	id: LayerId;
	offset: Point;
}

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function moveUnder(target: PointerTarget, canvas: Point): Move | null {
	const layerId = target.layerIds[0] ?? null;
	select(target.user, layerId);
	const layer = layerId === null ? null : target.doc.layer(layerId);
	if (layer === null) {
		return null;
	}
	const origin = parentPointOf(target, layer.id, canvas);
	return { id: layer.id, offset: { x: origin.x - layer.x, y: origin.y - layer.y } };
}

export function createPickBehavior(): ToolBehavior {
	let held: Move | null = null;

	function apply(target: PointerTarget, canvas: Point): void {
		if (held === null) {
			return;
		}
		const point = parentPointOf(target, held.id, canvas);
		target.doc.update(held.id, { x: point.x - held.offset.x, y: point.y - held.offset.y });
	}

	return {
		tap(target) {
			select(target.user, target.layerIds[0] ?? null);
			return true;
		},
		dragStart(target, origin, point) {
			held = moveUnder(target, origin.canvas);
			apply(target, point.canvas);
			return held !== null;
		},
		drag(target, point) {
			apply(target, point.canvas);
		},
		dragEnd(target, point) {
			if (held === null) {
				return;
			}
			apply(target, point.canvas);
			held = null;
			target.doc.commit(COMMIT_MESSAGES.move);
		},
		context(target, client) {
			const { layerIds } = target;
			target.user.menu.set(layerIds.length === 0 ? null : { client, layerIds });
			return true;
		},
	};
}

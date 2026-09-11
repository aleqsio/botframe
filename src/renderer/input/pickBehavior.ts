import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { containsPoint } from "./layerSpace";
import { applyMove, beginMove, finishMove } from "./moveDrag";
import { parentPointOf, selectedLayer } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function heldSelection(target: PointerTarget, canvas: Point): Layer | null {
	const layer = selectedLayer(target);
	if (layer === null || !containsPoint(layer, parentPointOf(target, layer.id, canvas))) {
		return null;
	}
	return layer;
}

function layerOfPress(target: PointerTarget, canvas: Point): Layer | null {
	const layerId = target.layerIds[0] ?? null;
	if (layerId !== null) {
		select(target.user, layerId);
		return target.doc.layer(layerId);
	}
	const held = heldSelection(target, canvas);
	if (held === null) {
		select(target.user, null);
	}
	return held;
}

function layerOfDrag(target: PointerTarget, canvas: Point): Layer | null {
	return heldSelection(target, canvas) ?? layerOfPress(target, canvas);
}

function holdsLayerUnder(target: PointerTarget): boolean {
	const selection = target.user.selection.get();
	return target.layerIds.some((id) => selection.includes(id));
}

function selectForMenu(target: PointerTarget): void {
	const layerId = target.layerIds[0];
	if (layerId !== undefined && !holdsLayerUnder(target)) {
		select(target.user, layerId);
	}
}

export function createPickBehavior(): ToolBehavior {
	return {
		tap(target, point) {
			layerOfPress(target, point.canvas);
			return true;
		},
		dragStart(target, origin, point) {
			const layer = layerOfDrag(target, origin.canvas);
			if (layer === null) {
				return false;
			}
			beginMove(target, layer, origin.canvas);
			applyMove(target, point);
			return true;
		},
		drag(target, point) {
			applyMove(target, point);
		},
		dragEnd(target, point) {
			finishMove(target, point);
		},
		context(target, client) {
			selectForMenu(target);
			target.user.menu.set({ client, layerIds: target.layerIds });
			return true;
		},
	};
}

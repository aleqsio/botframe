import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import { NOTHING_SELECTED, toggleSelected } from "../state/userState";
import type { UserState } from "../state/userState";
import { drawnLayer } from "./drawn";
import { insideSubtree } from "./dropTarget";
import { containsPoint } from "./layerSpace";
import { extendsSelection } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { applyMove, beginMove, finishMove } from "./moveDrag";
import { parentPointOf, readerOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function topHit(target: PointerTarget): LayerId | null {
	return target.layerIds[0] ?? null;
}

function isHeld(target: PointerTarget, layerId: LayerId): boolean {
	return target.user.selection.get().includes(layerId);
}

function holdsLayer(target: PointerTarget, layerId: LayerId, inside: LayerId | null): boolean {
	if (inside === null || inside === layerId) {
		return false;
	}
	return insideSubtree((id) => target.doc.layer(id), inside, layerId);
}

function heldLayers(target: PointerTarget): Layer[] {
	return target.user.selection.get().flatMap((id) => target.doc.layer(id) ?? []);
}

function coversPress(target: PointerTarget, layer: Layer, canvas: Point): boolean {
	const drawn = drawnLayer(readerOf(target), layer);
	return containsPoint(drawn, parentPointOf(target, layer.id, canvas));
}

function heldSelection(target: PointerTarget, canvas: Point): Layer | null {
	const under = topHit(target);
	if (under !== null && isHeld(target, under)) {
		return null;
	}
	return (
		heldLayers(target).find(
			(layer) => !holdsLayer(target, layer.id, under) && coversPress(target, layer, canvas),
		) ?? null
	);
}

function layerOfPress(target: PointerTarget, canvas: Point): Layer | null {
	const layerId = topHit(target);
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

function pressWith(target: PointerTarget, canvas: Point, modifiers: Modifiers): void {
	if (!extendsSelection(modifiers)) {
		layerOfPress(target, canvas);
		return;
	}
	const layerId = topHit(target);
	if (layerId !== null) {
		toggleSelected(target.user.selection, layerId);
	}
}

function layerOfDrag(target: PointerTarget, canvas: Point): Layer | null {
	return heldSelection(target, canvas) ?? layerOfPress(target, canvas);
}

function holdsPress(target: PointerTarget, under: LayerId): boolean {
	return target.user.selection
		.get()
		.some((id) => target.layerIds.includes(id) && !holdsLayer(target, id, under));
}

function selectForMenu(target: PointerTarget): void {
	const under = topHit(target);
	if (under !== null && !holdsPress(target, under)) {
		select(target.user, under);
	}
}

function layerIdUnder(target: PointerTarget, point: StagePoint): LayerId | null {
	return target.layerIdsAt(point)[0] ?? null;
}

export function createPickBehavior(): ToolBehavior {
	return {
		highlight: layerIdUnder,
		tap(target, point, modifiers) {
			pressWith(target, point.canvas, modifiers);
			return true;
		},
		dragStart(target, origin, point, modifiers) {
			const layer = layerOfDrag(target, origin.canvas);
			if (layer === null) {
				return false;
			}
			beginMove(target, layer, origin.canvas);
			applyMove(target, point, modifiers);
			return true;
		},
		drag(target, point, modifiers) {
			applyMove(target, point, modifiers);
		},
		dragEnd(target, point, modifiers) {
			finishMove(target, point, modifiers);
		},
		context(target, client) {
			selectForMenu(target);
			target.user.menu.set({ client, layerIds: target.layerIds });
			return true;
		},
	};
}

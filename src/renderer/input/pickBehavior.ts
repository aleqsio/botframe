import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { insideSubtree } from "./dropTarget";
import { applyGroupMove, beginGroupMove, finishGroupMove } from "./groupMove";
import { containsPoint } from "./layerSpace";
import { extendsSelection } from "./modifiers";
import { deeperId, heldAncestorOf, pickedId } from "./pickTarget";
import type { Modifiers } from "./modifiers";
import { applyMove, beginMove, finishMove } from "./moveDrag";
import { selectIds, toggleSelected } from "./selection";
import { drawnReaderOf, parentPointOf, readerOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

const NO_LAYERS: readonly LayerId[] = [];

function select(user: UserState, layerId: LayerId | null): void {
	selectIds(user.selection, layerId === null ? NO_LAYERS : [layerId]);
}

function topHit(target: PointerTarget): LayerId | null {
	return target.layerIds[0] ?? null;
}

function pickedHit(target: PointerTarget): LayerId | null {
	const hit = topHit(target);
	return hit === null ? null : pickedId(readerOf(target), target.user.selection.get(), hit);
}

function heldHit(target: PointerTarget): LayerId | null {
	const hit = topHit(target);
	return hit === null ? null : heldAncestorOf(readerOf(target), target.user.selection.get(), hit);
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
	const drawn = drawnReaderOf(target)(layer.id) ?? layer;
	return containsPoint(drawn, parentPointOf(target, layer.id, canvas));
}

function heldSelection(target: PointerTarget, canvas: Point): Layer | null {
	const under = topHit(target);
	if (heldHit(target) !== null) {
		return null;
	}
	return (
		heldLayers(target).find(
			(layer) => !holdsLayer(target, layer.id, under) && coversPress(target, layer, canvas),
		) ?? null
	);
}

function layerOfPress(target: PointerTarget, canvas: Point): Layer | null {
	const layerId = pickedHit(target);
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
	const layerId = pickedHit(target);
	if (layerId !== null) {
		toggleSelected(readerOf(target), target.user.selection, layerId);
	}
}

function layerOfDrag(target: PointerTarget, canvas: Point): Layer | null {
	const held = heldHit(target);
	if (held !== null) {
		return target.doc.layer(held);
	}
	return heldSelection(target, canvas) ?? layerOfPress(target, canvas);
}

function dragsGroup(target: PointerTarget, canvas: Point): boolean {
	if (topHit(target) !== null) {
		return heldHit(target) !== null;
	}
	return heldSelection(target, canvas) !== null;
}

function holdsPress(target: PointerTarget, under: LayerId): boolean {
	return target.user.selection
		.get()
		.some((id) => target.layerIds.includes(id) && !holdsLayer(target, id, under));
}

function selectForMenu(target: PointerTarget): void {
	const under = topHit(target);
	if (under !== null && !holdsPress(target, under)) {
		select(target.user, pickedHit(target));
	}
}

function layerIdUnder(target: PointerTarget, point: StagePoint): LayerId | null {
	const hit = target.layerIdsAt(point)[0];
	return hit === undefined ? null : pickedId(readerOf(target), target.user.selection.get(), hit);
}

function selectDeeper(target: PointerTarget): boolean {
	const hit = topHit(target);
	const deeper = hit === null ? null : deeperId(readerOf(target), target.user.selection.get(), hit);
	if (deeper === null) {
		return false;
	}
	select(target.user, deeper);
	return true;
}

export function createPickBehavior(): ToolBehavior {
	return {
		highlight: layerIdUnder,
		tap(target, point, modifiers) {
			pressWith(target, point.canvas, modifiers);
			return true;
		},
		dragStart(target, origin, point, modifiers) {
			if (dragsGroup(target, origin.canvas) && beginGroupMove(target, origin.canvas)) {
				applyGroupMove(target, point.canvas);
				return true;
			}
			const layer = layerOfDrag(target, origin.canvas);
			if (layer === null) {
				return false;
			}
			beginMove(target, layer, origin.canvas);
			applyMove(target, point, modifiers);
			return true;
		},
		drag(target, point, modifiers) {
			applyGroupMove(target, point.canvas);
			return applyMove(target, point, modifiers);
		},
		dragEnd(target, point, modifiers) {
			finishGroupMove(target, point.canvas);
			finishMove(target, point, modifiers);
		},
		doubleTap(target) {
			return selectDeeper(target);
		},
		context(target, client) {
			selectForMenu(target);
			target.user.menu.set({ client, layerIds: target.layerIds });
			return true;
		},
	};
}

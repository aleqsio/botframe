import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { zoneAt } from "./handles";
import type { Handle, Zone } from "./handles";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizedRect, rotatedDegrees } from "./transform";

const NOTHING_SELECTED: readonly LayerId[] = [];

type Drag =
	| { kind: "move"; id: LayerId; offset: Point }
	| { kind: "resize"; start: Layer; handle: Handle }
	| { kind: "rotate"; start: Layer; origin: Point };

const COMMIT_MESSAGES: Readonly<Record<Drag["kind"], string>> = {
	move: "move layer",
	resize: "resize layer",
	rotate: "rotate layer",
};

function topLayerId(target: PointerTarget): LayerId | null {
	return target.layerIds[0] ?? null;
}

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function selectedLayer(target: PointerTarget): Layer | null {
	const [id] = target.user.selection.get();
	return id === undefined ? null : target.doc.layer(id);
}

function zoneUnder(target: PointerTarget, canvas: Point): Zone | null {
	const layer = selectedLayer(target);
	return layer === null ? null : zoneAt(layer, canvas, target.user.camera.get().zoom);
}

function moveDrag(doc: DesignDocument, layerId: LayerId | null, origin: Point): Drag | null {
	const layer = layerId === null ? null : doc.layer(layerId);
	if (layer === null) {
		return null;
	}
	return { kind: "move", id: layer.id, offset: { x: origin.x - layer.x, y: origin.y - layer.y } };
}

function beginDrag(target: PointerTarget, origin: Point): Drag | null {
	const layer = selectedLayer(target);
	const zone = layer === null ? null : zoneAt(layer, origin, target.user.camera.get().zoom);
	if (layer !== null && zone !== null) {
		if (zone.mode === "rotate") {
			return { kind: "rotate", start: layer, origin };
		}
		return { kind: "resize", start: layer, handle: zone.handle };
	}
	const layerId = topLayerId(target);
	select(target.user, layerId);
	return moveDrag(target.doc, layerId, origin);
}

function applyDrag(doc: DesignDocument, drag: Drag, point: Point, modifiers: Modifiers): void {
	switch (drag.kind) {
		case "move": {
			doc.move(drag.id, point.x - drag.offset.x, point.y - drag.offset.y);
			break;
		}
		case "resize": {
			doc.resize(drag.start.id, resizedRect(drag.start, drag.handle, point, modifiers));
			break;
		}
		case "rotate": {
			doc.rotate(drag.start.id, rotatedDegrees(drag.start, drag.origin, point, modifiers));
			break;
		}
	}
}

export function createSelectBehavior(): ToolBehavior {
	let current: Drag | null = null;

	function apply(target: PointerTarget, point: Point, modifiers: Modifiers): void {
		if (current !== null) {
			applyDrag(target.doc, current, point, modifiers);
		}
	}

	return {
		hover(target, point) {
			return zoneUnder(target, point.canvas);
		},
		tap(target, point) {
			if (zoneUnder(target, point.canvas) === null) {
				select(target.user, topLayerId(target));
			}
		},
		dragStart(target, origin, point, modifiers) {
			current = beginDrag(target, origin.canvas);
			apply(target, point.canvas, modifiers);
		},
		drag(target, point, modifiers) {
			apply(target, point.canvas, modifiers);
		},
		dragEnd(target, point, modifiers) {
			const drag = current;
			if (drag === null) {
				return;
			}
			apply(target, point.canvas, modifiers);
			current = null;
			target.doc.commit(COMMIT_MESSAGES[drag.kind]);
		},
		context(target, client) {
			const { layerIds } = target;
			target.user.menu.set(layerIds.length === 0 ? null : { client, layerIds });
		},
	};
}

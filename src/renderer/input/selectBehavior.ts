import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { zoneAt } from "./handles";
import type { Handle, Zone } from "./handles";
import { COMMIT_MESSAGES } from "./layerCommand";
import { parentChain, toParentPoint } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizedRect, rotatedDegrees } from "./transform";

type Drag =
	| { kind: "move"; id: LayerId; offset: Point }
	| { kind: "resize"; start: Layer; handle: Handle }
	| { kind: "rotate"; start: Layer; origin: Point };

interface Aim {
	layer: Layer;
	point: Point;
	zone: Zone | null;
}

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function selectedLayer(target: PointerTarget): Layer | null {
	const [id] = target.user.selection.get();
	return id === undefined ? null : target.doc.layer(id);
}

function chainOf(target: PointerTarget, id: LayerId): Layer[] {
	return parentChain((layerId) => target.doc.layer(layerId), id);
}

function aimAt(target: PointerTarget, canvas: Point): Aim | null {
	const layer = selectedLayer(target);
	if (layer === null) {
		return null;
	}
	const point = toParentPoint(chainOf(target, layer.id), canvas);
	return { layer, point, zone: zoneAt(layer, point, target.user.camera.get().zoom) };
}

function zoneUnder(target: PointerTarget, canvas: Point): Zone | null {
	return aimAt(target, canvas)?.zone ?? null;
}

function handleDrag(aim: Aim | null): Drag | null {
	if (aim === null || aim.zone === null) {
		return null;
	}
	const { layer, point, zone } = aim;
	if (zone.mode === "rotate") {
		return { kind: "rotate", start: layer, origin: point };
	}
	return { kind: "resize", start: layer, handle: zone.handle };
}

function moveDrag(target: PointerTarget, canvas: Point): Drag | null {
	const layerId = target.layerIds[0] ?? null;
	select(target.user, layerId);
	const layer = layerId === null ? null : target.doc.layer(layerId);
	if (layer === null) {
		return null;
	}
	const origin = toParentPoint(chainOf(target, layer.id), canvas);
	return { kind: "move", id: layer.id, offset: { x: origin.x - layer.x, y: origin.y - layer.y } };
}

function draggedId(drag: Drag): LayerId {
	return drag.kind === "move" ? drag.id : drag.start.id;
}

function applyDrag(target: PointerTarget, drag: Drag, canvas: Point, modifiers: Modifiers): void {
	const { doc } = target;
	const point = toParentPoint(chainOf(target, draggedId(drag)), canvas);
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
			applyDrag(target, current, point, modifiers);
		}
	}

	return {
		hover(target, point) {
			return zoneUnder(target, point.canvas);
		},
		tap(target, point) {
			if (zoneUnder(target, point.canvas) === null) {
				select(target.user, target.layerIds[0] ?? null);
			}
		},
		dragStart(target, origin, point, modifiers) {
			current = handleDrag(aimAt(target, origin.canvas)) ?? moveDrag(target, origin.canvas);
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

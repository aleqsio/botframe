import type { Layer, LayerId } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import { cursorKeyOf } from "./cursor";
import type { CursorKey } from "./cursor";
import { gripDrag } from "./gripDrag";
import { zoneAt } from "./handles";
import type { HandleZone } from "./handles";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { resizeGripOf, snappedResize } from "./resizeSnap";
import type { ResizeGrip } from "./resizeSnap";
import { parentChainOf, parentDisplayOf, parentPointOf, soleLayer } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch, rotatedDegrees } from "./transform";

type Grip = ({ kind: "resize" } & ResizeGrip) | { kind: "rotate"; start: Layer; origin: Point };

interface Aim {
	layer: Layer;
	point: Point;
	zone: HandleZone | null;
}

function aimAt(target: PointerTarget, canvas: Point): Aim | null {
	const layer = soleLayer(target);
	if (layer === null) {
		return null;
	}
	const point = parentPointOf(target, layer.id, canvas);
	return { layer, point, zone: zoneAt(layer, point, target.user.camera.get().zoom) };
}

function zoneUnder(target: PointerTarget, canvas: Point): HandleZone | null {
	return aimAt(target, canvas)?.zone ?? null;
}

function cursorUnder(target: PointerTarget, canvas: Point): CursorKey | null {
	const aim = aimAt(target, canvas);
	if (aim === null || aim.zone === null) {
		return null;
	}
	return cursorKeyOf(aim.zone, [...parentChainOf(target, aim.layer.id), aim.layer]);
}

function heldLayerId(target: PointerTarget, point: StagePoint): LayerId | null {
	const aim = aimAt(target, point.canvas);
	return aim === null || aim.zone === null ? null : aim.layer.id;
}

function gripFor(target: PointerTarget, aim: Aim | null): Grip | null {
	if (aim === null || aim.zone === null) {
		return null;
	}
	const { layer, point, zone } = aim;
	if (zone.mode === "rotate") {
		return { kind: "rotate", start: layer, origin: point };
	}
	return { kind: "resize", ...resizeGripOf(target, layer, zone.handle) };
}

function applyGrip(target: PointerTarget, grip: Grip, canvas: Point, modifiers: Modifiers): void {
	const point = parentPointOf(target, grip.start.id, canvas);
	if (grip.kind === "resize") {
		const rect = snappedResize(target, grip, point, modifiers);
		const display = parentDisplayOf(target, grip.start);
		target.doc.update(grip.start.id, resizePatch(grip.start, display, rect));
		return;
	}
	target.doc.update(grip.start.id, {
		rotation: rotatedDegrees(grip.start, grip.origin, point, modifiers),
	});
}

export function createHandleBehavior(): ToolBehavior {
	return {
		hover(target, point) {
			return cursorUnder(target, point.canvas);
		},
		highlight: heldLayerId,
		tap(target, point) {
			return zoneUnder(target, point.canvas) !== null;
		},
		...gripDrag({
			gripAt: (target, canvas) => gripFor(target, aimAt(target, canvas)),
			apply: applyGrip,
			finish(target, grip) {
				target.doc.commit(COMMIT_MESSAGES[grip.kind]);
			},
		}),
	};
}

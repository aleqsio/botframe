import type { Layer, LayerId } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Point, StagePoint } from "../state/camera";
import { zoneAt } from "./handles";
import type { Handle, Zone } from "./handles";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { parentPointOf, selectedLayer } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch, resizedRect, rotatedDegrees } from "./transform";

type Grip =
	| { kind: "resize"; start: Layer; handle: Handle }
	| { kind: "rotate"; start: Layer; origin: Point };

interface Aim {
	layer: Layer;
	point: Point;
	zone: Zone | null;
}

function aimAt(target: PointerTarget, canvas: Point): Aim | null {
	const layer = selectedLayer(target);
	if (layer === null) {
		return null;
	}
	const point = parentPointOf(target, layer.id, canvas);
	return { layer, point, zone: zoneAt(layer, point, target.user.camera.get().zoom) };
}

function zoneUnder(target: PointerTarget, canvas: Point): Zone | null {
	return aimAt(target, canvas)?.zone ?? null;
}

function heldLayerId(target: PointerTarget, point: StagePoint): LayerId | null {
	const aim = aimAt(target, point.canvas);
	return aim === null || aim.zone === null ? null : aim.layer.id;
}

function gripFor(aim: Aim | null): Grip | null {
	if (aim === null || aim.zone === null) {
		return null;
	}
	const { layer, point, zone } = aim;
	if (zone.mode === "rotate") {
		return { kind: "rotate", start: layer, origin: point };
	}
	return { kind: "resize", start: layer, handle: zone.handle };
}

function parentDisplayOf(target: PointerTarget, start: Layer): DisplayMode {
	const parent = start.parent === null ? null : target.doc.layer(start.parent);
	return parent?.layout.display ?? "block";
}

function applyGrip(target: PointerTarget, grip: Grip, canvas: Point, modifiers: Modifiers): void {
	const point = parentPointOf(target, grip.start.id, canvas);
	if (grip.kind === "resize") {
		const rect = resizedRect(grip.start, grip.handle, point, modifiers);
		const display = parentDisplayOf(target, grip.start);
		target.doc.update(grip.start.id, resizePatch(grip.start, display, rect));
		return;
	}
	target.doc.update(grip.start.id, {
		rotation: rotatedDegrees(grip.start, grip.origin, point, modifiers),
	});
}

export function createHandleBehavior(): ToolBehavior {
	let held: Grip | null = null;

	function apply(target: PointerTarget, canvas: Point, modifiers: Modifiers): void {
		if (held !== null) {
			applyGrip(target, held, canvas, modifiers);
		}
	}

	return {
		hover(target, point) {
			return zoneUnder(target, point.canvas);
		},
		highlight: heldLayerId,
		tap(target, point) {
			return zoneUnder(target, point.canvas) !== null;
		},
		dragStart(target, origin, point, modifiers) {
			held = gripFor(aimAt(target, origin.canvas));
			apply(target, point.canvas, modifiers);
			return held !== null;
		},
		drag(target, point, modifiers) {
			apply(target, point.canvas, modifiers);
			return false;
		},
		dragEnd(target, point, modifiers) {
			const grip = held;
			if (grip === null) {
				return;
			}
			apply(target, point.canvas, modifiers);
			held = null;
			target.doc.commit(COMMIT_MESSAGES[grip.kind]);
		},
	};
}

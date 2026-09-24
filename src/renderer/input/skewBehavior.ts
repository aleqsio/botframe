import type { Layer } from "../../document/layer";
import type { Point } from "../state/camera";
import { skewCursorKeyOf } from "./cursor";
import { gripDrag } from "./gripDrag";
import { SKEW_MESSAGE } from "./layerCommand";
import { layerChain } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { skewZoneAt, skewedPatch } from "./skewHandle";
import type { SkewGrip, SkewZone } from "./skewHandle";
import { drawnReaderOf, isLoose, parentPointOf, soleLayer } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

interface SkewAim {
	grip: SkewGrip;
	zone: SkewZone;
	chain: readonly Layer[];
}

function aimAt(target: PointerTarget, canvas: Point): SkewAim | null {
	const start = soleLayer(target);
	if (start === null) {
		return null;
	}
	const chain = layerChain(drawnReaderOf(target), start.id);
	const zone = skewZoneAt(chain, canvas, target.user.camera.get().zoom);
	if (zone === null) {
		return null;
	}
	const from = parentPointOf(target, start.id, canvas);
	return { grip: { start, edge: zone.handle, from }, zone, chain };
}

function applyGrip(
	target: PointerTarget,
	grip: SkewGrip,
	canvas: Point,
	modifiers: Modifiers,
): void {
	const { start } = grip;
	const { x, y, ...skew } = skewedPatch(grip, parentPointOf(target, start.id, canvas), modifiers);
	target.doc.update(start.id, isLoose(target, start) ? { x, y, ...skew } : skew);
}

export function createSkewBehavior(): ToolBehavior {
	return {
		hover(target, point) {
			const aim = aimAt(target, point.canvas);
			return aim === null ? null : skewCursorKeyOf(aim.zone, aim.chain);
		},
		highlight(target, point) {
			return aimAt(target, point.canvas)?.grip.start.id ?? null;
		},
		...gripDrag({
			gripAt: (target, canvas) => aimAt(target, canvas)?.grip ?? null,
			apply: applyGrip,
			finish(target) {
				target.doc.commit(SKEW_MESSAGE);
			},
		}),
	};
}

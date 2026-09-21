import type { Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { touchedIds } from "./marqueeHit";
import { outermost, selectIds } from "./selection";
import { drawnReaderOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

function boxBetween(origin: Point, point: Point): Rect {
	return {
		x: Math.min(origin.x, point.x),
		y: Math.min(origin.y, point.y),
		width: Math.abs(point.x - origin.x),
		height: Math.abs(point.y - origin.y),
	};
}

function sweepMarquee(target: PointerTarget, point: Point): void {
	const marquee = target.user.marquee.get();
	if (marquee === null) {
		return;
	}
	const box = boxBetween(marquee.origin, point);
	target.user.marquee.set({ origin: marquee.origin, box });
	const read = drawnReaderOf(target);
	selectIds(target.user.selection, outermost(read, touchedIds(read, target.doc.layerIds(), box)));
}

export function createMarqueeBehavior(): ToolBehavior {
	return {
		dragStart(target, start, point) {
			target.user.marquee.set({
				origin: start.canvas,
				box: boxBetween(start.canvas, start.canvas),
			});
			sweepMarquee(target, point.canvas);
			return true;
		},
		drag(target, point) {
			sweepMarquee(target, point.canvas);
			return false;
		},
		dragEnd(target, point) {
			sweepMarquee(target, point.canvas);
			target.user.marquee.set(null);
		},
	};
}

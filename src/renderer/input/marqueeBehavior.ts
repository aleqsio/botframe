import type { Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { touchedIds } from "./marqueeHit";
import { outermost, selectIds } from "./selection";
import { readerOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

function boxBetween(origin: Point, point: Point): Rect {
	return {
		x: Math.min(origin.x, point.x),
		y: Math.min(origin.y, point.y),
		width: Math.abs(point.x - origin.x),
		height: Math.abs(point.y - origin.y),
	};
}

function sweepMarquee(target: PointerTarget, origin: Point, point: Point): void {
	const box = boxBetween(origin, point);
	target.user.marquee.set(box);
	const read = readerOf(target);
	selectIds(target.user.selection, outermost(read, touchedIds(read, target.doc.layerIds(), box)));
}

export function createMarqueeBehavior(): ToolBehavior {
	let origin: Point | null = null;

	function sweep(target: PointerTarget, point: Point): void {
		if (origin !== null) {
			sweepMarquee(target, origin, point);
		}
	}

	return {
		dragStart(target, start, point) {
			origin = start.canvas;
			sweep(target, point.canvas);
			return true;
		},
		drag(target, point) {
			sweep(target, point.canvas);
			return false;
		},
		dragEnd(target, point) {
			sweep(target, point.canvas);
			origin = null;
			target.user.marquee.set(null);
		},
	};
}

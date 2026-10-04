import type { GroupSource } from "./groupFit";
import type { Layer, LayerId, LayerPatch } from "./layer";
import type { Size } from "./length";
import { radiansOf } from "./linear";
import type { Point } from "./linear";
import { pivotOf } from "./space";

export interface GroupStart extends Size {
	children: readonly Layer[];
}

function ratio(after: number, before: number): number {
	return before === 0 ? 1 : after / before;
}

function scaledChild(child: Layer, along: Point): LayerPatch {
	const turn = radiansOf(child.rotation);
	const cos = Math.abs(Math.cos(turn));
	const sin = Math.abs(Math.sin(turn));
	const width = child.width * Math.hypot(along.x * cos, along.y * sin);
	const height = child.height * Math.hypot(along.x * sin, along.y * cos);
	const pivot = pivotOf(child);
	const moved = pivotOf({ ...child, width, height });
	return {
		x: (child.x + pivot.x) * along.x - moved.x,
		y: (child.y + pivot.y) * along.y - moved.y,
		width,
		height,
	};
}

export function scaleGroup(
	source: GroupSource,
	starts: Map<LayerId, GroupStart>,
	before: Layer,
): void {
	const after = source.layer(before.id);
	if (after === null || (after.width === before.width && after.height === before.height)) {
		return;
	}
	const children = source.childIds(before.id).flatMap((child) => source.layer(child) ?? []);
	const start = starts.get(before.id) ?? { width: before.width, height: before.height, children };
	starts.set(before.id, start);
	const along = { x: ratio(after.width, start.width), y: ratio(after.height, start.height) };
	for (const child of start.children) {
		source.update(child.id, scaledChild(child, along));
	}
}

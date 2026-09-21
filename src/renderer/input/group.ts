import type { LayerPatch, Rect } from "../../document/layer";
import type { DisplayMode } from "../../document/layout";
import type { Affine } from "./affine";
import { boundsOf, canvasCornersOf, posedOf, transformedPlace } from "./groupFrame";
import type { Posed } from "./groupFrame";
import type { Placed } from "./layerSpace";
import { freeAxesOf, placedOn } from "./snapAxes";
import { readerOf } from "./targetSpace";
import type { PointerTarget } from "./tool";
import { resizePatch } from "./transform";

export interface Group {
	frame: Rect;
	layers: readonly Posed[];
}

export type GroupChange = "move" | "rotate" | "resize";

export function groupOf(target: PointerTarget): Group | null {
	const ids = target.user.selection.get();
	if (ids.length < 2) {
		return null;
	}
	const layers = ids.flatMap((id) => posedOf(readerOf(target), id) ?? []);
	const frame = boundsOf(layers.flatMap((posed) => canvasCornersOf(posed)));
	return frame === null ? null : { frame, layers };
}

export function framePlaced(frame: Rect): Placed {
	return { ...frame, rotation: 0 };
}

function parentDisplayOf(posed: Posed): DisplayMode | null {
	return posed.chain.at(-1)?.layout.display ?? null;
}

function movedPatch(posed: Posed, place: Placed): LayerPatch {
	const axes = freeAxesOf(parentDisplayOf(posed), posed.layer.layout.position);
	return placedOn(axes, {
		x: posed.layer.x + place.x - posed.drawn.x,
		y: posed.layer.y + place.y - posed.drawn.y,
	});
}

function patchOf(posed: Posed, place: Placed, change: GroupChange): LayerPatch {
	if (change === "move") {
		return movedPatch(posed, place);
	}
	if (change === "rotate") {
		return { ...movedPatch(posed, place), rotation: place.rotation };
	}
	return { ...resizePatch(posed.drawn, parentDisplayOf(posed), place), rotation: place.rotation };
}

export function placeGroup(
	target: PointerTarget,
	group: Group,
	affine: Affine,
	change: GroupChange,
): void {
	for (const posed of group.layers) {
		target.doc.update(posed.layer.id, patchOf(posed, transformedPlace(posed, affine), change));
	}
}

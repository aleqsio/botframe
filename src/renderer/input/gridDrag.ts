import type { Layer, LayerId } from "../../document/layer";
import type { Placement } from "../../document/layout";
import { placedAt, samePlacement } from "../components/layout/cellPlacement";
import type { Point } from "../state/camera";
import type { PointerTarget } from "./tool";

const HALF = 2;
const FIRST_LINE = 1;

export function trackIndexOf(
	sizes: readonly number[],
	gap: number,
	start: number,
	at: number,
): number {
	let edge = start;
	for (const [index, size] of sizes.entries()) {
		edge += size;
		if (at < edge + gap / HALF) {
			return index;
		}
		edge += gap;
	}
	return Math.max(sizes.length - 1, 0);
}

export function recellInGrid(
	target: PointerTarget,
	layer: Layer,
	parent: LayerId,
	point: Point,
): void {
	const grid = target.drawn.grid(parent);
	if (grid.columns.length === 0 || grid.rows.length === 0) {
		return;
	}
	const inset = target.drawn.inset(parent);
	const at = {
		column: trackIndexOf(grid.columns, grid.columnGap, inset.left, point.x) + FIRST_LINE,
		row: trackIndexOf(grid.rows, grid.rowGap, inset.top, point.y) + FIRST_LINE,
	};
	const wanted: Placement = placedAt(at, at);
	if (!samePlacement(layer.layout.cell, wanted)) {
		target.doc.update(layer.id, { layout: { cell: wanted } });
	}
}

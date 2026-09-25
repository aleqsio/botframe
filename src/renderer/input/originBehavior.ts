import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { gripDrag } from "./gripDrag";
import type { Modifiers } from "./modifiers";
import { ORIGIN_MESSAGE, groupPivotOf, layerPivot, movedOrigin, nearPivot, pivotIn } from "./pivot";
import { pivotGroupOf, snappedInBox, snappedInLayer } from "./pivotSnap";
import type { PivotGroup } from "./pivotSnap";
import { boundsOf } from "./selectionBounds";
import {
	drawnReaderOf,
	isLoose,
	parentChainOf,
	parentDisplayOf,
	parentPointOf,
} from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch } from "./transform";

type PivotGrip = { kind: "layer"; start: Layer } | ({ kind: "group" } & PivotGroup);

function layerGrip(target: PointerTarget, id: LayerId, canvas: Point): PivotGrip | null {
	const start = drawnReaderOf(target)(id);
	const zoom = target.user.camera.get().zoom;
	return start !== null && nearPivot(layerPivot(parentChainOf(target, id), start), canvas, zoom)
		? { kind: "layer", start }
		: null;
}

function groupGrip(
	target: PointerTarget,
	ids: readonly LayerId[],
	canvas: Point,
): PivotGrip | null {
	const { user } = target;
	const box = boundsOf(drawnReaderOf(target), ids);
	return box !== null &&
		nearPivot(groupPivotOf(user.groupPivot.get(), ids, box), canvas, user.camera.get().zoom)
		? { kind: "group", ...pivotGroupOf(target, ids, box) }
		: null;
}

function gripAt(target: PointerTarget, canvas: Point): PivotGrip | null {
	const ids = target.user.selection.get();
	const [id, peer] = ids;
	if (id === undefined) {
		return null;
	}
	return peer === undefined ? layerGrip(target, id, canvas) : groupGrip(target, ids, canvas);
}

function moveLayerOrigin(
	target: PointerTarget,
	start: Layer,
	canvas: Point,
	modifiers: Modifiers,
): void {
	const point = parentPointOf(target, start.id, canvas);
	const snapped = snappedInLayer(target, start, point, modifiers);
	const { origin, place } = movedOrigin(start, snapped);
	const rect = { ...place, width: start.width, height: start.height };
	const moved = isLoose(target, start)
		? resizePatch(start, parentDisplayOf(target, start), rect)
		: {};
	target.doc.update(start.id, { ...moved, origin });
}

function applyGrip(
	target: PointerTarget,
	grip: PivotGrip,
	canvas: Point,
	modifiers: Modifiers,
): void {
	if (grip.kind === "layer") {
		moveLayerOrigin(target, grip.start, canvas, modifiers);
		return;
	}
	const point = snappedInBox(target, grip, canvas, modifiers);
	target.user.groupPivot.set(pivotIn(grip.ids, grip.box, point));
}

export function createOriginBehavior(): ToolBehavior {
	return {
		hover(target, point) {
			return gripAt(target, point.canvas) === null ? null : "origin";
		},
		...gripDrag({
			gripAt,
			apply: applyGrip,
			finish(target, grip) {
				if (grip.kind === "layer") {
					target.doc.commit(ORIGIN_MESSAGE);
				}
			},
		}),
	};
}

import type { Layer, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { ORIGIN_ZONE } from "./handles";
import { ORIGIN_MESSAGE, groupPivotOf, layerPivot, movedOrigin, nearPivot } from "./pivot";
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

type PivotGrip = { kind: "layer"; start: Layer } | { kind: "group"; ids: readonly LayerId[] };

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
		? { kind: "group", ids }
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

function moveLayerOrigin(target: PointerTarget, start: Layer, canvas: Point): void {
	const { origin, place } = movedOrigin(start, parentPointOf(target, start.id, canvas));
	const rect = { ...place, width: start.width, height: start.height };
	const moved = isLoose(target, start)
		? resizePatch(start, parentDisplayOf(target, start), rect)
		: {};
	target.doc.update(start.id, { ...moved, origin });
}

function applyGrip(target: PointerTarget, grip: PivotGrip, canvas: Point): void {
	if (grip.kind === "layer") {
		moveLayerOrigin(target, grip.start, canvas);
		return;
	}
	target.user.groupPivot.set({ ids: grip.ids, point: canvas });
}

export function createOriginBehavior(): ToolBehavior {
	let held: PivotGrip | null = null;

	function apply(target: PointerTarget, canvas: Point): void {
		if (held !== null) {
			applyGrip(target, held, canvas);
		}
	}

	return {
		hover(target, point) {
			return gripAt(target, point.canvas) === null ? null : ORIGIN_ZONE;
		},
		dragStart(target, origin, point) {
			held = gripAt(target, origin.canvas);
			apply(target, point.canvas);
			return held !== null;
		},
		drag(target, point) {
			apply(target, point.canvas);
			return false;
		},
		dragEnd(target, point) {
			const grip = held;
			apply(target, point.canvas);
			held = null;
			if (grip?.kind === "layer") {
				target.doc.commit(ORIGIN_MESSAGE);
			}
		},
	};
}

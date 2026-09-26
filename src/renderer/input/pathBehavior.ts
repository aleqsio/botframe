import type { Layer } from "../../document/layer";
import { editableVertices } from "../../document/vertices";
import type { Vertex } from "../../document/vertices";
import type { Point } from "../state/camera";
import { gripDrag } from "./gripDrag";
import { intoLayer } from "./layerSpace";
import { PART_REACH, movedPart, partAt, toggledVertex } from "./pathEdit";
import type { PathPart } from "./pathEdit";
import { fittedPatch } from "./pathFit";
import { selectIds } from "./selection";
import { drawnReaderOf, parentDisplayOf, parentPointOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

const PATH_MESSAGE = "edit path";

interface PathAim {
	layer: Layer;
	vertices: readonly Vertex[];
	local: Point;
	part: PathPart | null;
}

interface PathGrip extends PathAim {
	part: PathPart;
}

function localPointOf(target: PointerTarget, layer: Layer, canvas: Point): Point {
	return intoLayer(layer, parentPointOf(target, layer.id, canvas));
}

function aimAt(target: PointerTarget, canvas: Point): PathAim | null {
	const id = target.user.pathEdit.get();
	const layer = id === null ? null : drawnReaderOf(target)(id);
	const vertices = layer === null ? null : editableVertices(layer.geometry, layer);
	if (layer === null || vertices === null) {
		return null;
	}
	const local = localPointOf(target, layer, canvas);
	const reach = PART_REACH / target.user.camera.get().zoom;
	return { layer, vertices, local, part: partAt(vertices, layer, local, reach) };
}

function gripAt(target: PointerTarget, canvas: Point): PathGrip | null {
	const aim = aimAt(target, canvas);
	return aim === null || aim.part === null ? null : { ...aim, part: aim.part };
}

function writeVertices(target: PointerTarget, layer: Layer, vertices: readonly Vertex[]): void {
	target.doc.update(layer.id, fittedPatch(layer, parentDisplayOf(target, layer), vertices));
}

function applyGrip(target: PointerTarget, grip: PathGrip, canvas: Point): void {
	const local = localPointOf(target, grip.layer, canvas);
	const shift = { x: local.x - grip.local.x, y: local.y - grip.local.y };
	writeVertices(target, grip.layer, movedPart(grip.vertices, grip.part, grip.layer, shift));
}

function toggleVertex(target: PointerTarget, canvas: Point): boolean {
	const aim = aimAt(target, canvas);
	if (aim === null || aim.part?.kind !== "vertex") {
		return false;
	}
	writeVertices(target, aim.layer, toggledVertex(aim.vertices, aim.part.index, aim.layer));
	target.doc.commit(PATH_MESSAGE);
	return true;
}

function startEdit(target: PointerTarget): boolean {
	const [id] = target.layerIds;
	const layer = id === undefined ? null : target.doc.layer(id);
	if (layer === null || editableVertices(layer.geometry, layer) === null) {
		return false;
	}
	selectIds(target.user.selection, [layer.id]);
	target.user.pathEdit.set(layer.id);
	return true;
}

export function createPathBehavior(): ToolBehavior {
	return {
		tap(target, point) {
			return gripAt(target, point.canvas) !== null;
		},
		doubleTap(target, point) {
			return toggleVertex(target, point.canvas) || startEdit(target);
		},
		...gripDrag({
			gripAt,
			apply: applyGrip,
			finish(target) {
				target.doc.commit(PATH_MESSAGE);
			},
		}),
	};
}

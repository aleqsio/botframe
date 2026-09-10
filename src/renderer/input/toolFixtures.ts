import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer } from "../../document/layer";
import { toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

export interface DragSpec {
	press: Point;
	release: Point;
	modifiers?: Modifiers;
}

export function targetOf(withLayer: boolean): PointerTarget {
	const doc = DesignDocument.create();
	return { doc, user: new UserState(), layerIds: withLayer ? [firstId(doc)] : [] };
}

export function drawnLayer(target: PointerTarget): Layer {
	const [id] = target.user.selection.get();
	const layer = id === undefined ? null : target.doc.layer(id);
	if (layer === null) {
		throw new Error("no layer is selected");
	}
	return layer;
}

export function pointAt(camera: Camera, stage: Point): StagePoint {
	return { stage, canvas: toCanvasPoint(camera, stage) };
}

export function tapAt(behavior: ToolBehavior, target: PointerTarget, stage: Point): void {
	behavior.tap?.(target, pointAt(target.user.camera.get(), stage));
}

export function dragOver(behavior: ToolBehavior, target: PointerTarget, spec: DragSpec): void {
	const camera = target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	behavior.dragStart?.(target, pointAt(camera, spec.press), pointAt(camera, spec.press), modifiers);
	behavior.drag?.(target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(target, pointAt(camera, spec.release), modifiers);
}

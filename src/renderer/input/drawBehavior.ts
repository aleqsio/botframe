import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, Rect } from "../../document/layer";
import { nextLayerName } from "../components/layerEntry";
import { DEFAULT_TOOL } from "../components/tools";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { drawnRect, tappedRect } from "./draw";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

const CANCEL_COMMIT = "cancel draw";
const NOTHING_SELECTED: readonly LayerId[] = [];

export interface DrawPreset {
	label: string;
	fill: string;
	clip: boolean;
	artboard: boolean;
	commit: string;
}

function layersOf(doc: DesignDocument): (Layer | null)[] {
	return doc.layerIds().map((id) => doc.layer(id));
}

function startLayer(target: PointerTarget, preset: DrawPreset, rect: Rect): LayerId {
	const id = target.doc.createLayer({
		...rect,
		fill: preset.fill,
		name: nextLayerName(preset.label, layersOf(target.doc)),
		clip: preset.clip,
		geometry: {
			kind: "rectangle",
			cornerRadius: 0,
			cornerSmoothing: 0,
			artboard: preset.artboard,
		},
	});
	target.user.selection.set([id]);
	return id;
}

function endGesture(target: PointerTarget, preset: DrawPreset): void {
	target.doc.commit(preset.commit);
	target.user.tool.set(DEFAULT_TOOL);
}

export function cancelDraw(doc: DesignDocument, user: UserState): void {
	const draw = user.draw.get();
	user.tool.set(DEFAULT_TOOL);
	if (draw === null) {
		return;
	}
	user.draw.set(null);
	user.selection.set(NOTHING_SELECTED);
	doc.deleteLayer(draw.id);
	doc.commit(CANCEL_COMMIT);
}

function stretch(target: PointerTarget, point: Point, modifiers: Modifiers): void {
	const draw = target.user.draw.get();
	if (draw !== null) {
		target.doc.resize(draw.id, drawnRect(draw.origin, point, modifiers));
	}
}

export function createDrawBehavior(preset: DrawPreset): () => ToolBehavior {
	return () => ({
		dragStart(target, start, point, modifiers) {
			const origin = start.canvas;
			const id = startLayer(target, preset, drawnRect(origin, point.canvas, modifiers));
			target.user.draw.set({ id, origin });
		},
		drag(target, point, modifiers) {
			stretch(target, point.canvas, modifiers);
		},
		dragEnd(target, point, modifiers) {
			if (target.user.draw.get() === null) {
				return;
			}
			stretch(target, point.canvas, modifiers);
			target.user.draw.set(null);
			endGesture(target, preset);
		},
		tap(target, point) {
			startLayer(target, preset, tappedRect(point.canvas));
			endGesture(target, preset);
		},
	});
}

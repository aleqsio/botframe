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
	const id = user.drawing.get();
	user.tool.set(DEFAULT_TOOL);
	if (id === null) {
		return;
	}
	user.drawing.set(null);
	user.selection.set(NOTHING_SELECTED);
	doc.deleteLayer(id);
	doc.commit(CANCEL_COMMIT);
}

export function createDrawBehavior(preset: DrawPreset): () => ToolBehavior {
	return () => {
		let origin: Point | null = null;
		let drawn: LayerId | null = null;

		function stretch(target: PointerTarget, point: Point, modifiers: Modifiers): void {
			if (origin === null || drawn === null) {
				return;
			}
			target.doc.resize(drawn, drawnRect(origin, point, modifiers));
		}

		return {
			dragStart(target, start, point, modifiers) {
				origin = start.canvas;
				drawn = startLayer(target, preset, drawnRect(origin, point.canvas, modifiers));
				target.user.drawing.set(drawn);
			},
			drag(target, point, modifiers) {
				stretch(target, point.canvas, modifiers);
			},
			dragEnd(target, point, modifiers) {
				const active = drawn !== null && target.user.drawing.get() === drawn;
				if (active) {
					stretch(target, point.canvas, modifiers);
					target.user.drawing.set(null);
					endGesture(target, preset);
				}
				origin = null;
				drawn = null;
			},
			tap(target, point) {
				startLayer(target, preset, tappedRect(point.canvas));
				endGesture(target, preset);
			},
		};
	};
}

import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, Rect } from "../../document/layer";
import { nextLayerName } from "../components/layerEntry";
import { DEFAULT_TOOL } from "../components/tools";
import type { Point } from "../state/camera";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { drawnRect, tappedRect } from "./draw";
import { layerChain, parentChain, toParentPoint } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

const CANCEL_COMMIT = "cancel draw";

export interface DrawPreset {
	label: string;
	fill: string;
	clip: boolean;
	artboard: boolean;
}

function layersOf(doc: DesignDocument): (Layer | null)[] {
	return doc.layerIds().map((id) => doc.layer(id));
}

function chainUnder(target: PointerTarget): Layer[] {
	return layerChain((id) => target.doc.layer(id), target.layerIds[0] ?? null);
}

function stretch(target: PointerTarget, point: Point, modifiers: Modifiers): void {
	const draw = target.user.draw.get();
	if (draw === null) {
		return;
	}
	const chain = parentChain((id) => target.doc.layer(id), draw.id);
	target.doc.resize(draw.id, drawnRect(draw.origin, toParentPoint(chain, point), modifiers));
}

function parentOf(chain: readonly Layer[]): LayerId | null {
	return chain.at(-1)?.id ?? null;
}

function startLayer(
	target: PointerTarget,
	preset: DrawPreset,
	rect: Rect,
	chain: readonly Layer[],
): LayerId {
	const id = target.doc.createLayer(
		{
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
		},
		parentOf(chain),
	);
	target.user.selection.set([id]);
	return id;
}

function endGesture(target: PointerTarget, preset: DrawPreset): void {
	target.doc.commit(`create ${preset.label.toLowerCase()}`);
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

export function createDrawBehavior(preset: DrawPreset): () => ToolBehavior {
	return () => ({
		dragStart(target, start, point, modifiers) {
			const chain = chainUnder(target);
			const origin = toParentPoint(chain, start.canvas);
			const corner = toParentPoint(chain, point.canvas);
			const id = startLayer(target, preset, drawnRect(origin, corner, modifiers), chain);
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
			const under = chainUnder(target);
			startLayer(target, preset, tappedRect(toParentPoint(under, point.canvas)), under);
			endGesture(target, preset);
		},
	});
}

import type { DesignDocument } from "../../document/document";
import type { Layer, LayerFields, LayerId, Rect } from "../../document/layer";
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

export interface DrawDefaults {
	label: string;
	fill: string;
	clip: boolean;
	artboard: boolean;
}

export const ARTBOARD_DEFAULTS: DrawDefaults = {
	label: "Artboard",
	fill: "#ffffff",
	clip: true,
	artboard: true,
};

export const RECTANGLE_DEFAULTS: DrawDefaults = {
	label: "Rectangle",
	fill: "#d9d9d9",
	clip: false,
	artboard: false,
};

export function drawnFields(defaults: DrawDefaults, rect: Rect, name: string): LayerFields {
	return {
		...rect,
		fill: defaults.fill,
		name,
		clip: defaults.clip,
		geometry: {
			kind: "rectangle",
			cornerRadius: 0,
			cornerSmoothing: 0,
			artboard: defaults.artboard,
		},
	};
}

export function drawCommit(defaults: DrawDefaults): string {
	return `create ${defaults.label.toLowerCase()}`;
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
	defaults: DrawDefaults,
	rect: Rect,
	chain: readonly Layer[],
): LayerId {
	const name = nextLayerName(defaults.label, layersOf(target.doc));
	const id = target.doc.createLayer(drawnFields(defaults, rect, name), parentOf(chain));
	target.user.selection.set([id]);
	return id;
}

function endGesture(target: PointerTarget, defaults: DrawDefaults): void {
	target.doc.commit(drawCommit(defaults));
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

export function createDrawBehavior(defaults: DrawDefaults): () => ToolBehavior {
	return () => ({
		dragStart(target, start, point, modifiers) {
			const chain = chainUnder(target);
			const origin = toParentPoint(chain, start.canvas);
			const corner = toParentPoint(chain, point.canvas);
			const id = startLayer(target, defaults, drawnRect(origin, corner, modifiers), chain);
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
			endGesture(target, defaults);
		},
		tap(target, point) {
			const under = chainUnder(target);
			startLayer(target, defaults, tappedRect(toParentPoint(under, point.canvas)), under);
			endGesture(target, defaults);
		},
	});
}

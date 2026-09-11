import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, Rect } from "../../document/layer";
import { drawnFields, finishDraw, placeLayer } from "../components/layerDefaults";
import type { DrawDefaults } from "../components/layerDefaults";
import { isArtboard, nextLayerName } from "../components/layerEntry";
import { DEFAULT_TOOL } from "../components/tools";
import type { Point } from "../state/camera";
import { NOTHING_SELECTED } from "../state/userState";
import type { UserState } from "../state/userState";
import { drawnRect, tappedRect } from "./draw";
import { layerChain, parentChain, toParentPoint } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

const CANCEL_COMMIT = "cancel draw";

function layersOf(doc: DesignDocument): (Layer | null)[] {
	return doc.layerIds().map((id) => doc.layer(id));
}

function chainUnder(target: PointerTarget): Layer[] {
	const read = (id: LayerId): Layer | null => target.doc.layer(id);
	return layerChain(read, target.layerIds.find((id) => isArtboard(read(id))) ?? null);
}

function stretch(target: PointerTarget, point: Point, modifiers: Modifiers): void {
	const draw = target.user.draw.get();
	if (draw === null) {
		return;
	}
	const chain = parentChain((id) => target.doc.layer(id), draw.id);
	target.doc.update(draw.id, drawnRect(draw.origin, toParentPoint(chain, point), modifiers));
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
	return placeLayer(target.doc, target.user, drawnFields(defaults, rect, name), parentOf(chain));
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
			return true;
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
			finishDraw(target.doc, target.user, defaults);
		},
		tap(target, point) {
			const under = chainUnder(target);
			startLayer(target, defaults, tappedRect(toParentPoint(under, point.canvas)), under);
			finishDraw(target.doc, target.user, defaults);
			return true;
		},
	});
}

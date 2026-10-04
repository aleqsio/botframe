import type { Layer, LayerFields, LayerId, Rect } from "../../document/layer";
import { DEFAULT_TEXT_STYLE } from "../../document/text";
import { nextLayerName } from "../components/layerEntry";
import type { Point } from "../state/camera";
import { drawnRect } from "./draw";
import { chainUnder } from "./drawBehavior";
import { parentChain, toParentPoint } from "./layerSpace";
import { NO_MODIFIERS } from "./modifiers";
import { CREATE_TEXT, startTextEdit } from "./textEdit";
import type { PointerTarget, ToolBehavior } from "./tool";

const TEXT_LABEL = "Text";
const TEXT_FILL = "#000000";
const LINE_PIXELS = DEFAULT_TEXT_STYLE.fontSize * DEFAULT_TEXT_STYLE.lineHeight;

function textFields(target: PointerTarget, rect: Rect): LayerFields {
	const layers = target.doc.layerIds().map((id) => target.doc.layer(id));
	return {
		...rect,
		fill: TEXT_FILL,
		name: nextLayerName(TEXT_LABEL, layers),
		clip: false,
		geometry: { kind: "text", content: "", ...DEFAULT_TEXT_STYLE },
	};
}

function placeText(target: PointerTarget, rect: Rect, chain: readonly Layer[]): LayerId {
	const id = target.doc.createLayer(textFields(target, rect), chain.at(-1)?.id ?? null);
	target.user.selection.set([id]);
	return id;
}

function beginEdit(target: PointerTarget, id: LayerId): void {
	target.user.tool.set("select");
	startTextEdit(target.user, id, CREATE_TEXT);
}

function lineAt(point: Point, width: number): Rect {
	return { x: point.x, y: point.y, width, height: LINE_PIXELS };
}

function stretch(target: PointerTarget, point: Point): LayerId | null {
	const draw = target.user.draw.get();
	if (draw === null) {
		return null;
	}
	const chain = parentChain((id) => target.doc.layer(id), draw.id);
	const rect = drawnRect(draw.origin, toParentPoint(chain, point), NO_MODIFIERS);
	target.doc.update(draw.id, { x: rect.x, y: rect.y, width: rect.width });
	return draw.id;
}

export function createTextBehavior(): ToolBehavior {
	return {
		tap(target, point) {
			const chain = chainUnder(target);
			const id = placeText(target, lineAt(toParentPoint(chain, point.canvas), 0), chain);
			target.doc.update(id, { layout: { width: "hug", height: "hug" } });
			beginEdit(target, id);
			return true;
		},
		dragStart(target, start, point) {
			const chain = chainUnder(target);
			const origin = toParentPoint(chain, start.canvas);
			const id = placeText(target, lineAt(origin, 0), chain);
			target.doc.update(id, { layout: { height: "hug" } });
			target.user.draw.set({ id, origin });
			stretch(target, point.canvas);
			return true;
		},
		drag(target, point) {
			stretch(target, point.canvas);
			return false;
		},
		dragEnd(target, point) {
			const id = stretch(target, point.canvas);
			target.user.draw.set(null);
			if (id !== null) {
				beginEdit(target, id);
			}
		},
	};
}

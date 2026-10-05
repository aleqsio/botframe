import { finishDraw } from "../components/layerDefaults";
import { fillWithAsset, mediaDefaults, naturalRect } from "../components/mediaLayer";
import type { PendingMedia } from "../state/userState";
import { chainUnder, createDrawBehavior, startLayer } from "./drawBehavior";
import { toParentPoint } from "./layerSpace";
import type { PointerTarget, ToolBehavior } from "./tool";

function drawFor(media: PendingMedia): ToolBehavior {
	return createDrawBehavior(mediaDefaults(media.asset))();
}

function fillDrawn(target: PointerTarget, media: PendingMedia): void {
	const draw = target.user.draw.get();
	if (draw !== null) {
		fillWithAsset(target.doc, draw.id, media.asset);
	}
}

function heldDraw(target: PointerTarget): ToolBehavior | null {
	const media = target.user.pendingMedia.get();
	return media === null ? null : drawFor(media);
}

export function createImageBehavior(): ToolBehavior {
	return {
		dragStart(target, origin, point, modifiers) {
			const media = target.user.pendingMedia.get();
			if (media === null) {
				return false;
			}
			drawFor(media).dragStart?.(target, origin, point, modifiers);
			fillDrawn(target, media);
			return true;
		},
		drag(target, point, modifiers) {
			return heldDraw(target)?.drag?.(target, point, modifiers) ?? false;
		},
		dragEnd(target, point, modifiers) {
			heldDraw(target)?.dragEnd?.(target, point, modifiers);
		},
		tap(target, point) {
			const media = target.user.pendingMedia.get();
			if (media === null) {
				return false;
			}
			const defaults = mediaDefaults(media.asset);
			const chain = chainUnder(target);
			const rect = naturalRect(media, toParentPoint(chain, point.canvas));
			const id = startLayer(target, defaults, rect, chain);
			fillWithAsset(target.doc, id, media.asset);
			finishDraw(target.doc, target.user, defaults);
			return true;
		},
	};
}

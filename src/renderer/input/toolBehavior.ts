import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { ToolId } from "../components/tools";
import { moveCamera } from "../state/camera";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";

const NOTHING_SELECTED: readonly LayerId[] = [];

export interface PointerTarget {
	doc: DesignDocument;
	user: UserState;
	layerIds: readonly LayerId[];
}

export interface ToolBehavior {
	tap?: (target: PointerTarget) => void;
	dragStart?: (target: PointerTarget, origin: StagePoint, point: StagePoint) => void;
	drag?: (target: PointerTarget, point: StagePoint) => void;
	dragEnd?: (target: PointerTarget, point: StagePoint) => void;
	context?: (target: PointerTarget, client: Point) => void;
}

interface Grab {
	id: LayerId;
	offsetX: number;
	offsetY: number;
}

function topLayerId(target: PointerTarget): LayerId | null {
	return target.layerIds[0] ?? null;
}

function select(user: UserState, layerId: LayerId | null): void {
	user.selection.set(layerId === null ? NOTHING_SELECTED : [layerId]);
}

function grabOf(doc: DesignDocument, layerId: LayerId | null, origin: Point): Grab | null {
	const layer = layerId === null ? null : doc.layer(layerId);
	if (layer === null) {
		return null;
	}
	return { id: layer.id, offsetX: origin.x - layer.x, offsetY: origin.y - layer.y };
}

function createSelectBehavior(): ToolBehavior {
	let grab: Grab | null = null;

	function moveTo(doc: DesignDocument, point: Point): void {
		if (grab === null) {
			return;
		}
		doc.move(grab.id, point.x - grab.offsetX, point.y - grab.offsetY);
	}

	return {
		tap(target) {
			select(target.user, topLayerId(target));
		},
		dragStart(target, origin, point) {
			const layerId = topLayerId(target);
			select(target.user, layerId);
			grab = grabOf(target.doc, layerId, origin.canvas);
			moveTo(target.doc, point.canvas);
		},
		drag(target, point) {
			moveTo(target.doc, point.canvas);
		},
		dragEnd(target, point) {
			if (grab === null) {
				return;
			}
			moveTo(target.doc, point.canvas);
			grab = null;
			target.doc.commit("move layer");
		},
		context(target, client) {
			const { layerIds } = target;
			target.user.menu.set(layerIds.length === 0 ? null : { client, layerIds });
		},
	};
}

function createHandBehavior(): ToolBehavior {
	let held: Point | null = null;

	function panTo(user: UserState, point: StagePoint): void {
		if (held === null) {
			return;
		}
		const pan = { x: point.stage.x - held.x, y: point.stage.y - held.y };
		held = point.stage;
		user.camera.set(moveCamera(user.camera.get(), pan));
	}

	return {
		dragStart(target, origin, point) {
			held = origin.stage;
			panTo(target.user, point);
		},
		drag(target, point) {
			panTo(target.user, point);
		},
		dragEnd(target, point) {
			panTo(target.user, point);
			held = null;
		},
	};
}

function noPointerBehavior(): ToolBehavior {
	return {};
}

export const TOOL_BEHAVIORS: Readonly<Record<ToolId, () => ToolBehavior>> = {
	select: createSelectBehavior,
	frame: noPointerBehavior,
	rectangle: noPointerBehavior,
	ellipse: noPointerBehavior,
	text: noPointerBehavior,
	image: noPointerBehavior,
	hand: createHandBehavior,
};

import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, LayerPatch } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import type { LayerMove, UserState } from "../state/userState";
import { BACK_TO_FLOW } from "../components/layout/resetChildren";
import { dropParentOf } from "./dropTarget";
import { COMMIT_MESSAGES } from "./layerCommand";
import { anchorOf, chainTurn, normalizeDegrees } from "./layerSpace";
import type { Modifiers } from "./modifiers";
import { settleInFlow } from "./flowDrag";
import { carryLayer } from "./moveCarry";
import { snapFieldAround } from "./snapField";
import { drawnReaderOf, parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const CANCEL_COMMIT = "cancel move";

function parentUnder(target: PointerTarget, move: LayerMove, point: StagePoint): LayerId | null {
	return dropParentOf(target.layerIdsAt(point), (id) => target.doc.layer(id), move.id);
}

function anchorAt(target: PointerTarget, layer: Layer, canvas: Point): Point {
	const drawn = drawnReaderOf(target)(layer.id) ?? layer;
	return anchorOf(drawn, parentPointOf(target, layer.id, canvas));
}

function turnOf(target: PointerTarget, layer: Layer): number {
	return layer.rotation + chainTurn(parentChainOf(target, layer.id));
}

function fixedFill(target: PointerTarget, id: LayerId): LayerPatch {
	const layer = target.doc.layer(id);
	const drawn = drawnReaderOf(target)(id);
	if (layer === null || drawn === null) {
		return {};
	}
	const wide = layer.layout.width === "fill";
	const tall = layer.layout.height === "fill";
	return {
		...(wide ? { width: drawn.width } : {}),
		...(tall ? { height: drawn.height } : {}),
		layout: { ...(wide ? { width: "fixed" } : {}), ...(tall ? { height: "fixed" } : {}) },
	};
}

function landedPatch(
	target: PointerTarget,
	move: LayerMove,
	parent: LayerId | null,
	rotation: number,
): LayerPatch {
	const display = parent === null ? null : target.doc.layer(parent)?.layout.display;
	if (display !== undefined && display !== null && display !== "block") {
		return { ...BACK_TO_FLOW, rotation };
	}
	const loose = fixedFill(target, move.id);
	return { ...loose, rotation, layout: { ...loose.layout, position: move.start.position } };
}

function retarget(target: PointerTarget, move: LayerMove, point: StagePoint): LayerMove {
	const parent = parentUnder(target, move, point);
	if (parent === move.parent || !target.doc.move(move.id, parent)) {
		return move;
	}
	const rotation = normalizeDegrees(move.turn - chainTurn(parentChainOf(target, move.id)));
	target.doc.update(move.id, landedPatch(target, move, parent, rotation));
	const next = { ...move, parent, field: snapFieldAround(target, move.id) };
	target.user.move.set(next);
	return next;
}

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	target.user.move.set({
		id: layer.id,
		from: layer.parent,
		parent: layer.parent,
		start: {
			x: layer.x,
			y: layer.y,
			width: layer.width,
			height: layer.height,
			rotation: layer.rotation,
			position: layer.layout.position,
			sizing: { width: layer.layout.width, height: layer.layout.height },
			cell: layer.layout.cell,
			index: target.doc.siblingIds(layer.parent).indexOf(layer.id),
		},
		anchor: anchorAt(target, layer, canvas),
		turn: turnOf(target, layer),
		field: snapFieldAround(target, layer.id),
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	const move = target.user.move.get();
	if (move === null) {
		return;
	}
	const landed = retarget(target, move, point);
	const lift = carryLayer(target, landed, point, modifiers);
	settleInFlow(target, landed, point.canvas, lift);
}

export function finishMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): void {
	if (target.user.move.get() === null) {
		return;
	}
	applyMove(target, point, modifiers);
	target.user.move.set(null);
	target.user.snap.set(null);
	target.user.lift.set(null);
	target.doc.commit(COMMIT_MESSAGES.move);
}

export function changesParent(move: LayerMove | null): boolean {
	return move !== null && move.parent !== move.from;
}

export function cancelMove(doc: DesignDocument, user: UserState): void {
	const move = user.move.get();
	if (move === null) {
		return;
	}
	user.move.set(null);
	user.snap.set(null);
	user.lift.set(null);
	doc.move(move.id, move.from, move.start.index);
	const { x, y, width, height, rotation, position, cell, sizing } = move.start;
	doc.update(move.id, { x, y, width, height, rotation, layout: { position, cell, ...sizing } });
	doc.commit(CANCEL_COMMIT);
}

import type { DesignDocument } from "../../document/document";
import { isGroup } from "../../document/layer";
import type { Layer, LayerId, LayerPatch, Pose } from "../../document/layer";
import type { Point, StagePoint } from "../state/camera";
import { movedIds } from "../state/userState";
import type { LayerMove, MovedLayer, UserState } from "../state/userState";
import { BACK_TO_FLOW } from "../components/layout/resetChildren";
import { dropParentOf, insideSubtree } from "./dropTarget";
import { COMMIT_MESSAGES } from "./layerCommand";
import { anchorOf, poseInside, seenLinear } from "./layerSpace";
import { fixedFill } from "./layoutGeometry";
import type { Linear } from "../../document/linear";
import type { Modifiers } from "./modifiers";
import { settleInFlow } from "./flowDrag";
import { carryFollowers, carryLayer } from "./moveCarry";
import { snapFieldAround } from "./snapField";
import { drawnReaderOf, parentChainOf, parentPointOf, readerOf } from "./targetSpace";
import type { PointerTarget } from "./tool";

const CANCEL_COMMIT = "cancel move";
const AUTO_CELL = { mode: "auto" } as const;

function parentUnder(target: PointerTarget, move: LayerMove, point: StagePoint): LayerId | null {
	const read = readerOf(target);
	const under = dropParentOf(target.layerIdsAt(point), read, movedIds(move));
	const from = move.from;
	if (from === null || !isGroup(read(from))) {
		return under;
	}
	return under === null || insideSubtree(read, from, under) ? from : under;
}

function anchorAt(target: PointerTarget, layer: Layer, canvas: Point): Point {
	const drawn = drawnReaderOf(target)(layer.id) ?? layer;
	return anchorOf(drawn, parentPointOf(target, layer.id, canvas));
}

function seenOf(target: PointerTarget, layer: Layer): Linear {
	return seenLinear(parentChainOf(target, layer.id), layer);
}

function fixedFillOf(target: PointerTarget, id: LayerId): LayerPatch {
	const layer = target.doc.layer(id);
	const drawn = drawnReaderOf(target)(id);
	return layer === null || drawn === null ? {} : fixedFill(layer, drawn);
}

function landedPatch(
	target: PointerTarget,
	move: MovedLayer,
	parent: LayerId | null,
	pose: Pose,
): LayerPatch {
	const display = parent === null ? null : target.doc.layer(parent)?.layout.display;
	if (display !== undefined && display !== null && display !== "block") {
		return { ...BACK_TO_FLOW, ...pose, layout: { ...BACK_TO_FLOW.layout, cell: AUTO_CELL } };
	}
	const loose = fixedFillOf(target, move.id);
	const layout = { ...loose.layout, position: move.start.position, cell: AUTO_CELL };
	return { ...loose, ...pose, layout };
}

function land(target: PointerTarget, moved: MovedLayer, parent: LayerId | null): boolean {
	if (target.doc.layer(moved.id)?.parent === parent || !target.doc.move(moved.id, parent)) {
		return false;
	}
	const pose = poseInside(parentChainOf(target, moved.id), moved.seen, moved.start);
	target.doc.update(moved.id, landedPatch(target, moved, parent, pose));
	return true;
}

function retarget(target: PointerTarget, move: LayerMove, point: StagePoint): LayerMove {
	const parent = parentUnder(target, move, point);
	if (parent === move.parent) {
		return move;
	}
	const order = target.doc.layerIds();
	const landed = [move, ...move.followers]
		.toSorted((one, other) => order.indexOf(one.id) - order.indexOf(other.id))
		.filter((moved) => land(target, moved, parent));
	if (!landed.some((moved) => moved.id === move.id)) {
		return move;
	}
	const next = { ...move, parent, field: snapFieldAround(target, movedIds(move)) };
	target.user.move.set(next);
	return next;
}

function movedLayerOf(target: PointerTarget, layer: Layer, canvas: Point): MovedLayer {
	return {
		id: layer.id,
		from: layer.parent,
		start: {
			x: layer.x,
			y: layer.y,
			width: layer.width,
			height: layer.height,
			rotation: layer.rotation,
			skewX: layer.skewX,
			skewY: layer.skewY,
			mirrored: layer.mirrored,
			position: layer.layout.position,
			sizing: { width: layer.layout.width, height: layer.layout.height },
			cell: layer.layout.cell,
			index: target.doc.siblingIds(layer.parent).indexOf(layer.id),
		},
		anchor: anchorAt(target, layer, canvas),
		seen: seenOf(target, layer),
	};
}

function followersOf(target: PointerTarget, lead: Layer, canvas: Point): MovedLayer[] {
	const read = readerOf(target);
	const ids = target.user.selection.get();
	const loose = ids.filter(
		(id) => !ids.some((other) => other !== id && insideSubtree(read, id, other)),
	);
	if (!loose.includes(lead.id)) {
		return [];
	}
	return loose
		.filter((id) => id !== lead.id)
		.flatMap((id) => {
			const layer = target.doc.layer(id);
			return layer === null ? [] : [movedLayerOf(target, layer, canvas)];
		});
}

export function beginMove(target: PointerTarget, layer: Layer, canvas: Point): void {
	const followers = followersOf(target, layer, canvas);
	target.user.move.set({
		...movedLayerOf(target, layer, canvas),
		parent: layer.parent,
		field: snapFieldAround(target, [layer.id, ...followers.map((follower) => follower.id)]),
		followers,
	});
}

export function applyMove(target: PointerTarget, point: StagePoint, modifiers: Modifiers): boolean {
	const move = target.user.move.get();
	if (move === null) {
		return false;
	}
	const landed = retarget(target, move, point);
	const carry = carryLayer(target, landed, point, modifiers);
	const shifted = { x: point.canvas.x + carry.shift.x, y: point.canvas.y + carry.shift.y };
	carryFollowers(target, landed, shifted);
	return settleInFlow(target, landed, point.canvas, carry);
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
	const moved = [move, ...move.followers].toSorted(
		(one, other) => one.start.index - other.start.index,
	);
	for (const layer of moved) {
		doc.move(layer.id, layer.from, layer.start.index);
	}
	for (const layer of moved) {
		const { position, cell, sizing, index: _index, ...placed } = layer.start;
		doc.update(layer.id, { ...placed, layout: { position, cell, ...sizing } });
	}
	doc.commit(CANCEL_COMMIT);
}

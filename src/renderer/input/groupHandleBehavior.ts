import type { Point } from "../state/camera";
import { SMALLEST_GROUP } from "./groupMove";
import { groupGripOf, groupResized, groupZoneAt, partOf } from "./groupResize";
import type { BoxZone, GroupGrip, GroupPart } from "./groupResize";
import { groupTurned } from "./groupRotate";
import type { GroupTurn } from "./groupRotate";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { groupPivotOf, pinnedPivot } from "./pivot";
import { drawnReaderOf, isLoose, parentDisplayOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch } from "./transform";

type GroupHold =
	| ({ kind: "resize" } & GroupGrip)
	| ({ kind: "rotate"; handle: GroupGrip["handle"] } & GroupTurn);

function allLoose(target: PointerTarget, parts: readonly GroupPart[]): boolean {
	return parts.every((part) => isLoose(target, part.start));
}

function resizeHold(target: PointerTarget, found: BoxZone): GroupHold | null {
	const grip = groupGripOf(drawnReaderOf(target), target.user.selection.get(), found);
	return grip !== null && allLoose(target, grip.parts) ? { kind: "resize", ...grip } : null;
}

function rotateHold(target: PointerTarget, canvas: Point, found: BoxZone): GroupHold | null {
	const read = drawnReaderOf(target);
	const ids = target.user.selection.get();
	const parts = ids.flatMap((id) => partOf(read, id));
	const pivot = groupPivotOf(target.user.groupPivot.get(), ids, found.box);
	return allLoose(target, parts)
		? { kind: "rotate", handle: found.zone.handle, pivot, from: canvas, parts }
		: null;
}

function holdAt(target: PointerTarget, canvas: Point): GroupHold | null {
	const ids = target.user.selection.get();
	if (ids.length < SMALLEST_GROUP) {
		return null;
	}
	const found = groupZoneAt(drawnReaderOf(target), ids, canvas, target.user.camera.get().zoom);
	if (found === null) {
		return null;
	}
	return found.zone.mode === "rotate"
		? rotateHold(target, canvas, found)
		: resizeHold(target, found);
}

function applyTurn(
	target: PointerTarget,
	turn: GroupTurn,
	canvas: Point,
	modifiers: Modifiers,
): void {
	for (const { start, place, rotation } of groupTurned(turn, canvas, modifiers)) {
		const rect = { ...place, width: start.width, height: start.height };
		const moved = resizePatch(start, parentDisplayOf(target, start), rect);
		target.doc.update(start.id, { ...moved, rotation });
	}
	const ids = turn.parts.map((part) => part.start.id);
	target.user.groupPivot.set(pinnedPivot(drawnReaderOf(target), ids, turn.pivot));
}

function applyHold(
	target: PointerTarget,
	hold: GroupHold,
	canvas: Point,
	modifiers: Modifiers,
): void {
	if (hold.kind === "rotate") {
		applyTurn(target, hold, canvas, modifiers);
		return;
	}
	for (const { start, rect } of groupResized(hold, canvas, modifiers)) {
		target.doc.update(start.id, resizePatch(start, parentDisplayOf(target, start), rect));
	}
}

export function createGroupHandleBehavior(): ToolBehavior {
	let held: GroupHold | null = null;

	return {
		hover(target, point) {
			const hold = holdAt(target, point.canvas);
			return hold === null ? null : { mode: hold.kind, handle: hold.handle };
		},
		highlight(target, point) {
			return holdAt(target, point.canvas)?.parts[0]?.start.id ?? null;
		},
		tap(target, point) {
			return holdAt(target, point.canvas) !== null;
		},
		dragStart(target, origin, point, modifiers) {
			held = holdAt(target, origin.canvas);
			if (held === null) {
				return false;
			}
			applyHold(target, held, point.canvas, modifiers);
			return true;
		},
		drag(target, point, modifiers) {
			if (held !== null) {
				applyHold(target, held, point.canvas, modifiers);
			}
			return false;
		},
		dragEnd(target, point, modifiers) {
			const hold = held;
			if (hold === null) {
				return;
			}
			applyHold(target, hold, point.canvas, modifiers);
			held = null;
			target.doc.commit(COMMIT_MESSAGES[hold.kind]);
		},
	};
}

import { outOfFlow } from "../layerStyle";
import type { Point } from "../state/camera";
import { SMALLEST_GROUP } from "./groupMove";
import { groupGripOf, groupResized, groupZoneOf } from "./groupResize";
import type { GroupGrip, GroupPart } from "./groupResize";
import { COMMIT_MESSAGES } from "./layerCommand";
import type { Modifiers } from "./modifiers";
import { drawnReaderOf, parentDisplayOf } from "./targetSpace";
import type { PointerTarget, ToolBehavior } from "./tool";
import { resizePatch } from "./transform";

function isLoose(target: PointerTarget, part: GroupPart): boolean {
	return outOfFlow(parentDisplayOf(target, part.start), part.start.layout.position);
}

function gripAt(target: PointerTarget, canvas: Point): GroupGrip | null {
	const ids = target.user.selection.get();
	if (ids.length < SMALLEST_GROUP) {
		return null;
	}
	const zoom = target.user.camera.get().zoom;
	const grip = groupGripOf(drawnReaderOf(target), ids, canvas, zoom);
	return grip?.parts.every((part) => isLoose(target, part)) === true ? grip : null;
}

function applyGrip(
	target: PointerTarget,
	grip: GroupGrip,
	canvas: Point,
	modifiers: Modifiers,
): void {
	for (const { start, rect } of groupResized(grip, canvas, modifiers)) {
		target.doc.update(start.id, resizePatch(start, parentDisplayOf(target, start), rect));
	}
}

export function createGroupHandleBehavior(): ToolBehavior {
	let held: GroupGrip | null = null;

	return {
		hover(target, point) {
			return groupZoneOf(gripAt(target, point.canvas));
		},
		highlight(target, point) {
			return gripAt(target, point.canvas)?.parts[0]?.start.id ?? null;
		},
		tap(target, point) {
			return gripAt(target, point.canvas) !== null;
		},
		dragStart(target, origin, point, modifiers) {
			held = gripAt(target, origin.canvas);
			if (held === null) {
				return false;
			}
			applyGrip(target, held, point.canvas, modifiers);
			return true;
		},
		drag(target, point, modifiers) {
			if (held !== null) {
				applyGrip(target, held, point.canvas, modifiers);
			}
			return false;
		},
		dragEnd(target, point, modifiers) {
			const grip = held;
			if (grip === null) {
				return;
			}
			applyGrip(target, grip, point.canvas, modifiers);
			held = null;
			target.doc.commit(COMMIT_MESSAGES.resize);
		},
	};
}

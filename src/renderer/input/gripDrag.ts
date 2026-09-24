import type { Point } from "../state/camera";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";

export interface GripSpec<Grip> {
	gripAt: (target: PointerTarget, canvas: Point) => Grip | null;
	apply: (target: PointerTarget, grip: Grip, canvas: Point, modifiers: Modifiers) => void;
	finish: (target: PointerTarget, grip: Grip) => void;
}

export function gripDrag<Grip>(
	spec: GripSpec<Grip>,
): Required<Pick<ToolBehavior, "dragStart" | "drag" | "dragEnd">> {
	let held: Grip | null = null;

	return {
		dragStart(target, origin, point, modifiers) {
			held = spec.gripAt(target, origin.canvas);
			if (held === null) {
				return false;
			}
			spec.apply(target, held, point.canvas, modifiers);
			return true;
		},
		drag(target, point, modifiers) {
			if (held !== null) {
				spec.apply(target, held, point.canvas, modifiers);
			}
			return false;
		},
		dragEnd(target, point, modifiers) {
			const grip = held;
			if (grip === null) {
				return;
			}
			spec.apply(target, grip, point.canvas, modifiers);
			held = null;
			target.user.snap.set(null);
			spec.finish(target, grip);
		},
	};
}

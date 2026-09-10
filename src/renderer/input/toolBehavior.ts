import type { ToolId } from "../components/tools";
import { moveCamera } from "../state/camera";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { ARTBOARD_DEFAULTS, RECTANGLE_DEFAULTS, createDrawBehavior } from "./drawBehavior";
import { createSelectBehavior } from "./selectBehavior";
import type { ToolBehavior } from "./tool";

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
	artboard: createDrawBehavior(ARTBOARD_DEFAULTS),
	rectangle: createDrawBehavior(RECTANGLE_DEFAULTS),
	ellipse: noPointerBehavior,
	text: noPointerBehavior,
	image: noPointerBehavior,
	hand: createHandBehavior,
};

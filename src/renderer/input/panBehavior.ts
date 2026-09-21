import { moveCamera } from "../state/camera";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import type { ToolBehavior } from "./tool";

export function createPanBehavior(): ToolBehavior {
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
			return true;
		},
		drag(target, point) {
			panTo(target.user, point);
			return false;
		},
		dragEnd(target, point) {
			panTo(target.user, point);
			held = null;
		},
	};
}

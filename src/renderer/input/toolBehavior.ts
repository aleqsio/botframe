import type { ToolId } from "../components/tools";
import { moveCamera } from "../state/camera";
import type { Point, StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { createDrawBehavior } from "./drawBehavior";
import type { DrawPreset } from "./drawBehavior";
import { createSelectBehavior } from "./selectBehavior";
import type { ToolBehavior } from "./tool";

const ARTBOARD: DrawPreset = {
	label: "Artboard",
	fill: "#ffffff",
	clip: true,
	artboard: true,
	commit: "create artboard",
};

const RECTANGLE: DrawPreset = {
	label: "Rectangle",
	fill: "#d9d9d9",
	clip: false,
	artboard: false,
	commit: "create rectangle",
};

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
	artboard: createDrawBehavior(ARTBOARD),
	rectangle: createDrawBehavior(RECTANGLE),
	ellipse: noPointerBehavior,
	text: noPointerBehavior,
	image: noPointerBehavior,
	hand: createHandBehavior,
};

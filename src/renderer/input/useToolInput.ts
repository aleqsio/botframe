import { useRef } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { UserState } from "../state/userState";
import { TOOL_BEHAVIORS } from "./toolBehavior";
import type { PointerTarget, ToolBehavior } from "./toolBehavior";
import type { StageInputHandlers } from "./useStageInput";

interface ToolGesture {
	behavior: ToolBehavior;
	target: PointerTarget;
}

export function useToolInput(doc: DesignDocument, user: UserState): StageInputHandlers {
	const gesture = useRef<ToolGesture | null>(null);

	function begin(layerId: LayerId | null): ToolGesture {
		return { behavior: TOOL_BEHAVIORS[user.tool.get()](), target: { doc, user, layerId } };
	}

	return {
		onDragStart(origin, point, layerId) {
			const current = begin(layerId);
			gesture.current = current;
			current.behavior.dragStart?.(current.target, origin, point);
		},
		onDragMove(point) {
			const current = gesture.current;
			current?.behavior.drag?.(current.target, point);
		},
		onDragEnd(point) {
			const current = gesture.current;
			gesture.current = null;
			current?.behavior.dragEnd?.(current.target, point);
		},
		onTap(layerId) {
			const current = begin(layerId);
			current.behavior.tap?.(current.target);
		},
	};
}

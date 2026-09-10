import { useRef } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { UserState } from "../state/userState";
import { visibleLayerIds } from "./hitTest";
import { TOOL_BEHAVIORS } from "./toolBehavior";
import type { PointerTarget, ToolBehavior } from "./toolBehavior";
import type { StageInputHandlers } from "./useStageInput";

interface ToolGesture {
	behavior: ToolBehavior;
	target: PointerTarget;
}

function targetOf(
	doc: DesignDocument,
	user: UserState,
	layerIds: readonly LayerId[],
): PointerTarget {
	return { doc, user, layerIds: visibleLayerIds(layerIds, (id) => doc.layer(id)?.fill ?? null) };
}

export function useToolInput(doc: DesignDocument, user: UserState): StageInputHandlers {
	const gesture = useRef<ToolGesture | null>(null);

	function begin(layerIds: readonly LayerId[]): ToolGesture {
		return { behavior: TOOL_BEHAVIORS[user.tool.get()](), target: targetOf(doc, user, layerIds) };
	}

	return {
		onDragStart(origin, point, layerIds) {
			const current = begin(layerIds);
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
		onTap(layerIds) {
			const current = begin(layerIds);
			current.behavior.tap?.(current.target);
		},
		onContextMenu(client, layerIds) {
			const current = begin(layerIds);
			current.behavior.context?.(current.target, client);
		},
	};
}

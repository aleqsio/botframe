import { useRef } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { zoneKey } from "./handles";
import { visibleLayerIds } from "./hitTest";
import type { PointerTarget, ToolBehavior } from "./tool";
import { TOOL_BEHAVIORS } from "./toolBehavior";
import type { StageInputHandlers } from "./useStageInput";

const NO_LAYERS: readonly LayerId[] = [];

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

	function hoverZone(point: StagePoint): void {
		const current = begin(NO_LAYERS);
		const zone = current.behavior.hover?.(current.target, point) ?? null;
		user.zone.set(zone === null ? null : zoneKey(zone));
	}

	return {
		onDragStart(origin, point, layerIds, modifiers) {
			const current = begin(layerIds);
			gesture.current = current;
			current.behavior.dragStart?.(current.target, origin, point, modifiers);
		},
		onDragMove(point, modifiers) {
			const current = gesture.current;
			current?.behavior.drag?.(current.target, point, modifiers);
		},
		onDragEnd(point, modifiers) {
			const current = gesture.current;
			gesture.current = null;
			current?.behavior.dragEnd?.(current.target, point, modifiers);
		},
		onTap(layerIds, point) {
			const current = begin(layerIds);
			current.behavior.tap?.(current.target, point);
		},
		onHover(point) {
			hoverZone(point);
		},
		onContextMenu(client, layerIds) {
			const current = begin(layerIds);
			current.behavior.context?.(current.target, client);
		},
	};
}

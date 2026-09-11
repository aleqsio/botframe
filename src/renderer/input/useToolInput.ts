import { useRef } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import { zoneKey } from "./handles";
import { layerIdsAt, visibleLayerIds } from "./hitTest";
import type { PointerTarget, ToolBehavior } from "./tool";
import { behaviorFor } from "./toolBehavior";
import type { StageInputHandlers } from "./useStageInput";

const NO_LAYERS: readonly LayerId[] = [];

interface ToolGesture {
	behavior: ToolBehavior;
	target: PointerTarget;
}

function visibleOf(doc: DesignDocument): (ids: readonly LayerId[]) => readonly LayerId[] {
	return (ids) => visibleLayerIds(ids, (id) => doc.layer(id)?.fill ?? null);
}

function targetOf(
	doc: DesignDocument,
	user: UserState,
	layerIds: readonly LayerId[],
): PointerTarget {
	const visible = visibleOf(doc);
	return {
		doc,
		user,
		layerIds: visible(layerIds),
		layerIdsAt: (point) => visible(layerIdsAt(point.client)),
	};
}

export function useToolInput(doc: DesignDocument, user: UserState): StageInputHandlers {
	const gesture = useRef<ToolGesture | null>(null);

	function begin(layerIds: readonly LayerId[]): ToolGesture {
		return { behavior: behaviorFor(user.tool.get()), target: targetOf(doc, user, layerIds) };
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
			user.dragging.set(true);
			current.behavior.dragStart?.(current.target, origin, point, modifiers);
		},
		onDragMove(point, modifiers) {
			const current = gesture.current;
			current?.behavior.drag?.(current.target, point, modifiers);
		},
		onDragEnd(point, modifiers) {
			const current = gesture.current;
			gesture.current = null;
			user.dragging.set(false);
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
			if (current.behavior.context?.(current.target, client) !== true) {
				user.menu.set({ client, layerIds: NO_LAYERS });
			}
		},
	};
}

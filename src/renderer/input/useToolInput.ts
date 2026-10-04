import { useRef } from "react";
import type { RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import type { StagePoint } from "../state/camera";
import type { UserState } from "../state/userState";
import type { Modifiers } from "./modifiers";
import { targetOf } from "./pointerTarget";
import type { PointerTarget, ToolBehavior } from "./tool";
import { behaviorFor } from "./toolBehavior";
import type { StageInputHandlers } from "./useStageInput";

const NO_LAYERS: readonly LayerId[] = [];

interface ToolStart {
	behavior: ToolBehavior;
	target: PointerTarget;
}

interface ToolGesture extends ToolStart {
	point: StagePoint;
	modifiers: Modifiers;
	frame: number;
}

function solveNextFrame(held: RefObject<ToolGesture | null>, current: ToolGesture): void {
	if (current.frame !== 0) {
		return;
	}
	current.frame = requestAnimationFrame(() => {
		current.frame = 0;
		if (held.current === current) {
			solve(held, current);
		}
	});
}

function solve(held: RefObject<ToolGesture | null>, current: ToolGesture): void {
	if (current.behavior.drag?.(current.target, current.point, current.modifiers) === true) {
		solveNextFrame(held, current);
	}
}

function doubleTap(start: ToolStart, point: StagePoint, modifiers: Modifiers): void {
	if (start.behavior.doubleTap?.(start.target, point, modifiers) !== true) {
		start.behavior.tap?.(start.target, point, modifiers);
	}
}

export function useToolInput(doc: DesignDocument, user: UserState): StageInputHandlers {
	const gesture = useRef<ToolGesture | null>(null);

	function begin(layerIds: readonly LayerId[]): ToolStart {
		return {
			behavior: behaviorFor(user.tool.get(), user.pathEdit.get() !== null),
			target: targetOf(doc, user, layerIds),
		};
	}

	function trackHover(point: StagePoint): void {
		const { behavior, target } = begin(NO_LAYERS);
		user.zone.set(behavior.hover?.(target, point) ?? null);
		user.highlight.set(behavior.highlight?.(target, point) ?? null);
	}

	return {
		onDragStart(origin, point, layerIds, modifiers) {
			const current = { ...begin(layerIds), point, modifiers, frame: 0 };
			gesture.current = current;
			user.dragging.set(true);
			if (current.behavior.dragStart?.(current.target, origin, point, modifiers) === true) {
				solveNextFrame(gesture, current);
			}
		},
		onDragMove(point, modifiers) {
			const current = gesture.current;
			if (current === null) {
				return;
			}
			current.point = point;
			current.modifiers = modifiers;
			solve(gesture, current);
		},
		onDragEnd(point, modifiers) {
			const current = gesture.current;
			gesture.current = null;
			user.dragging.set(false);
			current?.behavior.dragEnd?.(current.target, point, modifiers);
		},
		onTap(layerIds, point, modifiers) {
			const current = begin(layerIds);
			current.behavior.tap?.(current.target, point, modifiers);
		},
		onDoubleTap(layerIds, point, modifiers) {
			doubleTap(begin(layerIds), point, modifiers);
		},
		onHover(point) {
			trackHover(point);
		},
		onLeave() {
			user.highlight.set(null);
		},
		onContextMenu(client, layerIds) {
			const current = begin(layerIds);
			if (current.behavior.context?.(current.target, client) !== true) {
				user.menu.set({ client, layerIds: NO_LAYERS });
			}
		},
	};
}

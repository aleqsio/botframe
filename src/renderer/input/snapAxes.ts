import type { GuideAxis } from "../../document/guides";
import type { DisplayMode, PositionMode } from "../../document/layout";
import { outOfFlow } from "../layerStyle";
import type { Point } from "../state/camera";
import { HANDLE_AXIS } from "./handles";
import type { Handle } from "./handles";
import type { Snap } from "./snap";

export const BOTH_AXES: readonly GuideAxis[] = ["x", "y"];
export const NO_AXES: readonly GuideAxis[] = [];
const CROSS_AXIS: Readonly<Record<"row" | "column", GuideAxis>> = { row: "y", column: "x" };

export function freeAxesOf(
	parentDisplay: DisplayMode | null,
	position: PositionMode,
): readonly GuideAxis[] {
	if (outOfFlow(parentDisplay, position)) {
		return BOTH_AXES;
	}
	if (parentDisplay === "row" || parentDisplay === "column") {
		return position === "offset" ? [CROSS_AXIS[parentDisplay]] : NO_AXES;
	}
	return NO_AXES;
}

export function handleAxesOf(handle: Handle): readonly GuideAxis[] {
	const axis = HANDLE_AXIS[handle];
	return BOTH_AXES.filter((name) => axis[name] !== 0);
}

export function placedOn(axes: readonly GuideAxis[], point: Point): Partial<Point> {
	return {
		...(axes.includes("x") ? { x: point.x } : {}),
		...(axes.includes("y") ? { y: point.y } : {}),
	};
}

export function snapOn(axes: readonly GuideAxis[], snap: Snap): Snap {
	return { x: axes.includes("x") ? snap.x : null, y: axes.includes("y") ? snap.y : null };
}

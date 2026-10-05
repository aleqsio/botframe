import type { Pose } from "../../document/layer";
import { HANDLE_AXIS } from "./handles";
import type { Corner, Handle, HandleZone } from "./handles";
import type { SkewZone } from "./skewHandle";
import { angleFrom, chainPose, normalizeDegrees, posePoint } from "./layerSpace";

const CURSOR_AXES = ["ew", "nwse", "ns", "nesw"] as const;
const TURN_SIDES = ["e", "se", "s", "sw", "w", "nw", "n", "ne"] as const;
const AXIS_STEP = 45;

type CursorAxis = (typeof CURSOR_AXES)[number];
type TurnSide = (typeof TURN_SIDES)[number];
export type CursorKey = `resize-${CursorAxis}` | `rotate-${TurnSide}` | "origin";
const SCREEN_ORIGIN = { x: 0, y: 0 };
const SKEW_ALONG: Readonly<Record<SkewZone["handle"], Handle>> = { n: "e", s: "e", e: "s", w: "s" };

function screenStepOf(handle: Handle, pose: Pose): number {
	const screen = posePoint(HANDLE_AXIS[handle], pose);
	return Math.round(normalizeDegrees(angleFrom(SCREEN_ORIGIN, screen)) / AXIS_STEP);
}

export function cursorAxisOf(handle: Handle, pose: Pose): CursorAxis {
	return CURSOR_AXES[screenStepOf(handle, pose) % CURSOR_AXES.length] ?? "ew";
}

export function turnSideOf(corner: Corner, pose: Pose): TurnSide {
	return TURN_SIDES[screenStepOf(corner, pose) % TURN_SIDES.length] ?? "e";
}

export function cursorKeyOf(zone: HandleZone, chain: readonly Pose[]): CursorKey {
	const pose = chainPose(chain);
	return zone.mode === "rotate"
		? `rotate-${turnSideOf(zone.handle, pose)}`
		: `resize-${cursorAxisOf(zone.handle, pose)}`;
}

export function skewCursorKeyOf(zone: SkewZone, chain: readonly Pose[]): CursorKey {
	return `resize-${cursorAxisOf(SKEW_ALONG[zone.handle], chainPose(chain))}`;
}

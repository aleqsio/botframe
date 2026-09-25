import type { Pose } from "../../document/layer";
import { HANDLE_AXIS } from "./handles";
import type { Handle, HandleZone } from "./handles";
import type { SkewZone } from "./skewHandle";
import { angleFrom, chainPose, normalizeDegrees, posePoint } from "./layerSpace";

const CURSOR_AXES = ["ew", "nwse", "ns", "nesw"] as const;
const AXIS_STEP = 45;

type CursorAxis = (typeof CURSOR_AXES)[number];
export type CursorKey = `resize-${CursorAxis}` | "rotate" | "origin";
const SCREEN_ORIGIN = { x: 0, y: 0 };
const SKEW_ALONG: Readonly<Record<SkewZone["handle"], Handle>> = { n: "e", s: "e", e: "s", w: "s" };

export function cursorAxisOf(handle: Handle, pose: Pose): CursorAxis {
	const screen = posePoint(HANDLE_AXIS[handle], pose);
	const step = Math.round(normalizeDegrees(angleFrom(SCREEN_ORIGIN, screen)) / AXIS_STEP);
	return CURSOR_AXES[step % CURSOR_AXES.length] ?? "ew";
}

export function cursorKeyOf(zone: HandleZone, chain: readonly Pose[]): CursorKey {
	return zone.mode === "rotate"
		? "rotate"
		: `resize-${cursorAxisOf(zone.handle, chainPose(chain))}`;
}

export function skewCursorKeyOf(zone: SkewZone, chain: readonly Pose[]): CursorKey {
	return `resize-${cursorAxisOf(SKEW_ALONG[zone.handle], chainPose(chain))}`;
}

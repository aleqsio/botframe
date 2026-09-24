import { heldSkew } from "../../document/layer";
import type { Pose } from "../../document/layer";
import type { Point } from "../state/camera";

export interface Linear {
	a: number;
	b: number;
	c: number;
	d: number;
}

export const HALF_TURN = 180;
export const NO_POSE: Pose = { rotation: 0, skewX: 0, skewY: 0, mirrored: false };
const UNIT_GRACE = 1e-9;
const DEGREE_PLACES = 1e9;

export function radiansOf(degrees: number): number {
	return (degrees * Math.PI) / HALF_TURN;
}

export function degreesOf(radians: number): number {
	return Math.round(((radians * HALF_TURN) / Math.PI) * DEGREE_PLACES) / DEGREE_PLACES + 0;
}

export function linearOf(pose: Pose): Linear {
	const turn = radiansOf(pose.rotation);
	const cos = Math.cos(turn);
	const sin = Math.sin(turn);
	const alongX = Math.tan(radiansOf(pose.skewX));
	const alongY = Math.tan(radiansOf(pose.skewY));
	const flip = pose.mirrored ? -1 : 1;
	const first = { x: (1 + alongX * alongY) * flip, y: alongY * flip };
	return {
		a: cos * first.x - sin * first.y,
		b: sin * first.x + cos * first.y,
		c: cos * alongX - sin,
		d: sin * alongX + cos,
	};
}

export function applyLinear(linear: Linear, point: Point): Point {
	return {
		x: linear.a * point.x + linear.c * point.y,
		y: linear.b * point.x + linear.d * point.y,
	};
}

export function multiplyLinear(outer: Linear, inner: Linear): Linear {
	return {
		a: outer.a * inner.a + outer.c * inner.b,
		b: outer.b * inner.a + outer.d * inner.b,
		c: outer.a * inner.c + outer.c * inner.d,
		d: outer.b * inner.c + outer.d * inner.d,
	};
}

export function determinantOf({ a, b, c, d }: Linear): number {
	return a * d - b * c;
}

export function invertLinear(linear: Linear): Linear {
	const det = determinantOf(linear);
	return { a: linear.d / det, b: -linear.b / det, c: -linear.c / det, d: linear.a / det };
}

type Unmirrored = Linear & { mirrored: boolean };

function unmirrored(linear: Linear): Unmirrored {
	const mirrored = determinantOf(linear) < 0;
	const flip = mirrored ? -1 : 1;
	return { ...linear, a: linear.a * flip, b: linear.b * flip, mirrored };
}

function poseAlong(held: Unmirrored, lean: number): Pose {
	const turn = Math.atan2(held.d, held.c) - Math.atan2(1, lean);
	const alongY = Math.cos(turn) * held.b - Math.sin(turn) * held.a;
	return {
		rotation: degreesOf(Math.atan2(Math.sin(turn), Math.cos(turn))),
		skewX: heldSkew(degreesOf(Math.atan(lean))),
		skewY: heldSkew(degreesOf(Math.atan(alongY))),
		mirrored: held.mirrored,
	};
}

function turnGap(one: number, other: number): number {
	const gap = Math.abs(one - other) % (2 * HALF_TURN);
	return Math.min(gap, 2 * HALF_TURN - gap);
}

function gapOf(pose: Pose, near: Pose): number {
	return (
		turnGap(pose.rotation, near.rotation) +
		Math.abs(pose.skewX - near.skewX) +
		Math.abs(pose.skewY - near.skewY)
	);
}

export function poseOf(linear: Linear, near: Pose = NO_POSE): Pose {
	const held = unmirrored(linear);
	const stretch = held.c ** 2 + held.d ** 2 - 1;
	const lean = stretch < UNIT_GRACE ? 0 : Math.sqrt(stretch);
	const forward = poseAlong(held, lean);
	const back = poseAlong(held, -lean);
	return gapOf(back, near) < gapOf(forward, near) ? back : forward;
}

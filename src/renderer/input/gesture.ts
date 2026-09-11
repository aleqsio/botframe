import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point } from "../state/camera";

const TAP_LIMIT = 4;
const TOUCH_POINTER = "touch";

export interface PointerSample {
	pointerId: number;
	x: number;
	y: number;
	touch: boolean;
}

export type Gesture =
	| { kind: "dragStart"; origin: Point; point: Point }
	| { kind: "dragMove"; point: Point }
	| { kind: "dragEnd"; point: Point }
	| { kind: "tap"; point: Point }
	| { kind: "pinch"; center: Point; pan: Point; scale: number };

export interface PointerDown {
	taken: boolean;
	ended: Gesture | null;
}

interface TrackedPointer {
	pointerId: number;
	origin: Point;
	point: Point;
	touch: boolean;
	dragging: boolean;
}

interface Pinch {
	first: TrackedPointer;
	second: TrackedPointer;
	center: Point;
	spread: number;
}

export function sampleOf(event: ReactPointerEvent<HTMLElement>): PointerSample {
	return {
		pointerId: event.pointerId,
		x: event.clientX,
		y: event.clientY,
		touch: event.pointerType === TOUCH_POINTER,
	};
}

function pointOf(sample: PointerSample): Point {
	return { x: sample.x, y: sample.y };
}

function trackerOf(sample: PointerSample): TrackedPointer {
	return {
		pointerId: sample.pointerId,
		origin: pointOf(sample),
		point: pointOf(sample),
		touch: sample.touch,
		dragging: false,
	};
}

function beyondTapLimit(origin: Point, point: Point): boolean {
	return Math.hypot(point.x - origin.x, point.y - origin.y) > TAP_LIMIT;
}

function centerOf(first: Point, second: Point): Point {
	return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function spreadOf(first: Point, second: Point): number {
	return Math.hypot(second.x - first.x, second.y - first.y);
}

function pinchOf(first: TrackedPointer, second: TrackedPointer): Pinch {
	return {
		first,
		second,
		center: centerOf(first.point, second.point),
		spread: spreadOf(first.point, second.point),
	};
}

function endOf(pointer: TrackedPointer): Gesture | null {
	return pointer.dragging ? { kind: "dragEnd", point: pointer.point } : null;
}

function pinchPointer(pinch: Pinch, pointerId: number): TrackedPointer | null {
	if (pinch.first.pointerId === pointerId) {
		return pinch.first;
	}
	return pinch.second.pointerId === pointerId ? pinch.second : null;
}

function otherPointer(pinch: Pinch, pointerId: number): TrackedPointer {
	return pinch.first.pointerId === pointerId ? pinch.second : pinch.first;
}

export class GestureRecognizer {
	#pointer: TrackedPointer | null = null;
	#pinch: Pinch | null = null;
	#resting: number | null = null;

	down(sample: PointerSample): PointerDown {
		if (this.#pinch !== null || this.#resting !== null) {
			return { taken: false, ended: null };
		}
		const first = this.#pointer;
		if (first === null) {
			this.#pointer = trackerOf(sample);
			return { taken: true, ended: null };
		}
		if (!first.touch || !sample.touch) {
			return { taken: false, ended: null };
		}
		this.#pointer = null;
		this.#pinch = pinchOf(first, trackerOf(sample));
		return { taken: true, ended: endOf(first) };
	}

	active(): boolean {
		return this.#pointer !== null || this.#pinch !== null || this.#resting !== null;
	}

	tracks(pointerId: number): boolean {
		const pinch = this.#pinch;
		if (pinch !== null) {
			return pinchPointer(pinch, pointerId) !== null;
		}
		if (this.#resting !== null) {
			return this.#resting === pointerId;
		}
		return this.#pointer?.pointerId === pointerId;
	}

	move(sample: PointerSample): Gesture | null {
		const pinch = this.#pinch;
		if (pinch !== null) {
			return this.#pinchMove(pinch, sample);
		}
		const pointer = this.#tracked(sample);
		if (pointer === null) {
			return null;
		}
		pointer.point = pointOf(sample);
		if (pointer.dragging) {
			return { kind: "dragMove", point: pointer.point };
		}
		if (!beyondTapLimit(pointer.origin, pointer.point)) {
			return null;
		}
		pointer.dragging = true;
		return { kind: "dragStart", origin: pointer.origin, point: pointer.point };
	}

	up(sample: PointerSample): Gesture | null {
		if (this.#lift(sample)) {
			return null;
		}
		const pointer = this.#release(sample);
		if (pointer === null) {
			return null;
		}
		const point = pointOf(sample);
		return pointer.dragging ? { kind: "dragEnd", point } : { kind: "tap", point };
	}

	cancel(sample: PointerSample): Gesture | null {
		if (this.#lift(sample)) {
			return null;
		}
		const pointer = this.#release(sample);
		return pointer === null ? null : endOf(pointer);
	}

	#pinchMove(pinch: Pinch, sample: PointerSample): Gesture | null {
		const pointer = pinchPointer(pinch, sample.pointerId);
		if (pointer === null) {
			return null;
		}
		pointer.point = pointOf(sample);
		const center = centerOf(pinch.first.point, pinch.second.point);
		const spread = spreadOf(pinch.first.point, pinch.second.point);
		const pan = { x: center.x - pinch.center.x, y: center.y - pinch.center.y };
		const scale = pinch.spread === 0 ? 1 : spread / pinch.spread;
		pinch.center = center;
		pinch.spread = spread;
		return { kind: "pinch", center, pan, scale };
	}

	#lift(sample: PointerSample): boolean {
		const pinch = this.#pinch;
		if (pinch !== null && pinchPointer(pinch, sample.pointerId) !== null) {
			this.#pinch = null;
			this.#resting = otherPointer(pinch, sample.pointerId).pointerId;
			return true;
		}
		if (this.#resting === sample.pointerId) {
			this.#resting = null;
			return true;
		}
		return false;
	}

	#tracked(sample: PointerSample): TrackedPointer | null {
		const pointer = this.#pointer;
		return pointer !== null && pointer.pointerId === sample.pointerId ? pointer : null;
	}

	#release(sample: PointerSample): TrackedPointer | null {
		const pointer = this.#tracked(sample);
		if (pointer !== null) {
			this.#pointer = null;
		}
		return pointer;
	}
}

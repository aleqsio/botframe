import type { Point } from "../state/camera";

const TAP_LIMIT = 4;

export interface PointerSample {
	pointerId: number;
	x: number;
	y: number;
}

export type Gesture =
	| { kind: "dragStart"; origin: Point; point: Point }
	| { kind: "dragMove"; point: Point }
	| { kind: "dragEnd"; point: Point }
	| { kind: "tap" };

interface TrackedPointer {
	pointerId: number;
	origin: Point;
	point: Point;
	dragging: boolean;
}

function pointOf(sample: PointerSample): Point {
	return { x: sample.x, y: sample.y };
}

function beyondTapLimit(origin: Point, point: Point): boolean {
	return Math.hypot(point.x - origin.x, point.y - origin.y) > TAP_LIMIT;
}

export class GestureRecognizer {
	#pointer: TrackedPointer | null = null;

	down(sample: PointerSample): boolean {
		if (this.#pointer !== null) {
			return false;
		}
		this.#pointer = {
			pointerId: sample.pointerId,
			origin: pointOf(sample),
			point: pointOf(sample),
			dragging: false,
		};
		return true;
	}

	tracks(pointerId: number): boolean {
		return this.#pointer?.pointerId === pointerId;
	}

	move(sample: PointerSample): Gesture | null {
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
		const pointer = this.#release(sample);
		if (pointer === null) {
			return null;
		}
		return pointer.dragging ? { kind: "dragEnd", point: pointOf(sample) } : { kind: "tap" };
	}

	cancel(sample: PointerSample): Gesture | null {
		const pointer = this.#release(sample);
		if (pointer === null || !pointer.dragging) {
			return null;
		}
		return { kind: "dragEnd", point: pointer.point };
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

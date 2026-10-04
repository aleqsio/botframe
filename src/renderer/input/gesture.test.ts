import { describe, expect, it } from "vitest";
import { GestureRecognizer } from "./gesture";
import type { Gesture, PointerSample } from "./gesture";

const PRIMARY = 1;
const SECOND = 2;
const THIRD = 3;

const TAKEN = { taken: true, ended: null };
const REFUSED = { taken: false, ended: null };

function at(pointerId: number, x: number, y: number, time = 0): PointerSample {
	return { pointerId, x, y, touch: false, time };
}

function finger(pointerId: number, x: number, y: number): PointerSample {
	return { pointerId, x, y, touch: true, time: 0 };
}

function tapAt(recognizer: GestureRecognizer, x: number, time: number): Gesture | null {
	recognizer.down(at(PRIMARY, x, 10, time));
	return recognizer.up(at(PRIMARY, x, 10, time));
}

function draggingRecognizer(): GestureRecognizer {
	const recognizer = new GestureRecognizer();
	recognizer.down(at(PRIMARY, 10, 10));
	recognizer.move(at(PRIMARY, 40, 30));
	return recognizer;
}

function pinchingRecognizer(): GestureRecognizer {
	const recognizer = new GestureRecognizer();
	recognizer.down(finger(PRIMARY, 100, 100));
	recognizer.down(finger(SECOND, 300, 100));
	return recognizer;
}

describe("GestureRecognizer", () => {
	it("takes the first pointer down and keeps quiet inside the tap limit", () => {
		const recognizer = new GestureRecognizer();

		expect(recognizer.down(at(PRIMARY, 10, 10))).toEqual(TAKEN);
		expect(recognizer.move(at(PRIMARY, 12, 11))).toBeNull();
	});

	it("starts the drag at the press point when the pointer passes the tap limit", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));

		expect(recognizer.move(at(PRIMARY, 40, 30))).toEqual({
			kind: "dragStart",
			origin: { x: 10, y: 10 },
			point: { x: 40, y: 30 },
		});
	});

	it("reports each move after the drag starts", () => {
		const recognizer = draggingRecognizer();

		expect(recognizer.move(at(PRIMARY, 50, 60))).toEqual({
			kind: "dragMove",
			point: { x: 50, y: 60 },
		});
	});

	it("ends the drag at the point of the pointer up", () => {
		const recognizer = draggingRecognizer();

		expect(recognizer.up(at(PRIMARY, 55, 65))).toEqual({
			kind: "dragEnd",
			point: { x: 55, y: 65 },
		});
	});

	it("ends the drag when the gesture is cancelled", () => {
		const recognizer = draggingRecognizer();

		expect(recognizer.cancel(at(PRIMARY, 40, 30))).toEqual({
			kind: "dragEnd",
			point: { x: 40, y: 30 },
		});
	});

	it("reports a tap when the press never started a drag", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));

		expect(recognizer.up(at(PRIMARY, 200, 200))).toEqual({
			kind: "tap",
			point: { x: 200, y: 200 },
		});
	});

	it("reports a tap when the pointer stays inside the tap limit", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));
		recognizer.move(at(PRIMARY, 12, 11));

		expect(recognizer.up(at(PRIMARY, 12, 11))).toEqual({ kind: "tap", point: { x: 12, y: 11 } });
	});

	it("reports no tap when the press is cancelled", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));

		expect(recognizer.cancel(at(PRIMARY, 10, 10))).toBeNull();
	});

	it("refuses a second mouse pointer while it tracks the first", () => {
		const recognizer = draggingRecognizer();

		expect(recognizer.down(at(SECOND, 200, 200))).toEqual(REFUSED);
		expect(recognizer.move(at(SECOND, 260, 260))).toBeNull();
		expect(recognizer.up(at(SECOND, 260, 260))).toBeNull();
		expect(recognizer.up(at(PRIMARY, 40, 30))).toEqual({
			kind: "dragEnd",
			point: { x: 40, y: 30 },
		});
	});

	it("tracks the pointer it took, and no other pointer", () => {
		const recognizer = new GestureRecognizer();
		expect(recognizer.tracks(PRIMARY)).toBe(false);

		recognizer.down(at(PRIMARY, 10, 10));
		expect(recognizer.tracks(PRIMARY)).toBe(true);
		expect(recognizer.tracks(SECOND)).toBe(false);

		recognizer.up(at(PRIMARY, 10, 10));
		expect(recognizer.tracks(PRIMARY)).toBe(false);
	});

	it("keeps the drag of the first pointer while a second mouse pointer rests on the glass", () => {
		const recognizer = draggingRecognizer();
		recognizer.down(at(SECOND, 200, 200));

		expect(recognizer.tracks(SECOND)).toBe(false);
		expect(recognizer.move(at(PRIMARY, 50, 60))).toEqual({
			kind: "dragMove",
			point: { x: 50, y: 60 },
		});
	});

	it("ignores a sample from a pointer it does not track", () => {
		const recognizer = new GestureRecognizer();

		expect(recognizer.move(at(PRIMARY, 40, 30))).toBeNull();
		expect(recognizer.up(at(PRIMARY, 40, 30))).toBeNull();
	});

	it("is active only while it tracks a pointer", () => {
		const recognizer = new GestureRecognizer();
		expect(recognizer.active()).toBe(false);

		recognizer.down(at(PRIMARY, 10, 10));
		expect(recognizer.active()).toBe(true);

		recognizer.up(at(PRIMARY, 10, 10));
		expect(recognizer.active()).toBe(false);
	});

	it("stays active through the drag and stops when the gesture is cancelled", () => {
		const recognizer = draggingRecognizer();
		expect(recognizer.active()).toBe(true);

		recognizer.cancel(at(PRIMARY, 40, 30));
		expect(recognizer.active()).toBe(false);
	});

	it("takes the next pointer after the gesture ends", () => {
		const recognizer = draggingRecognizer();
		recognizer.up(at(PRIMARY, 40, 30));

		expect(recognizer.down(at(SECOND, 200, 200))).toEqual(TAKEN);
	});
});

describe("GestureRecognizer with two fingers", () => {
	it("ends the drag in flight when the second finger lands", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(finger(PRIMARY, 100, 100));
		recognizer.move(finger(PRIMARY, 140, 130));

		expect(recognizer.down(finger(SECOND, 300, 100))).toEqual({
			taken: true,
			ended: { kind: "dragEnd", point: { x: 140, y: 130 } },
		});
		expect(recognizer.move(finger(PRIMARY, 160, 140))).toMatchObject({ kind: "pinch" });
	});

	it("ends the press in flight with no tap when the second finger lands", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(finger(PRIMARY, 100, 100));

		expect(recognizer.down(finger(SECOND, 300, 100))).toEqual(TAKEN);
	});

	it("tracks both fingers of the two finger gesture", () => {
		const recognizer = pinchingRecognizer();

		expect(recognizer.tracks(PRIMARY)).toBe(true);
		expect(recognizer.tracks(SECOND)).toBe(true);
		expect(recognizer.tracks(THIRD)).toBe(false);
	});

	it("reports the movement of the point between the fingers", () => {
		const recognizer = pinchingRecognizer();

		expect(recognizer.move(finger(PRIMARY, 300, 300))).toEqual({
			kind: "pinch",
			center: { x: 300, y: 200 },
			pan: { x: 100, y: 100 },
			scale: 1,
		});
	});

	it("reports the scale from the distance between the fingers", () => {
		const recognizer = pinchingRecognizer();

		expect(recognizer.move(finger(SECOND, 500, 100))).toEqual({
			kind: "pinch",
			center: { x: 300, y: 100 },
			pan: { x: 100, y: 0 },
			scale: 2,
		});
	});

	it("reports the movement from the last report only", () => {
		const recognizer = pinchingRecognizer();
		recognizer.move(finger(PRIMARY, 140, 100));

		expect(recognizer.move(finger(SECOND, 340, 100))).toEqual({
			kind: "pinch",
			center: { x: 240, y: 100 },
			pan: { x: 20, y: 0 },
			scale: 1.25,
		});
	});

	it("ends the gesture with no jump when one finger lifts", () => {
		const recognizer = pinchingRecognizer();

		expect(recognizer.up(finger(SECOND, 300, 100))).toBeNull();
		expect(recognizer.move(finger(PRIMARY, 400, 400))).toBeNull();
		expect(recognizer.up(finger(PRIMARY, 400, 400))).toBeNull();
	});

	it("refuses a new gesture while the last finger rests on the glass", () => {
		const recognizer = pinchingRecognizer();
		recognizer.up(finger(SECOND, 300, 100));

		expect(recognizer.down(finger(THIRD, 200, 200))).toEqual(REFUSED);
		expect(recognizer.up(finger(PRIMARY, 100, 100))).toBeNull();
		expect(recognizer.down(finger(THIRD, 200, 200))).toEqual(TAKEN);
	});

	it("stays active while the fingers hold the canvas and until the last finger lifts", () => {
		const recognizer = pinchingRecognizer();
		expect(recognizer.active()).toBe(true);

		recognizer.up(finger(SECOND, 300, 100));
		expect(recognizer.active()).toBe(true);

		recognizer.up(finger(PRIMARY, 100, 100));
		expect(recognizer.active()).toBe(false);
	});

	it("refuses a third finger while the two fingers hold the canvas", () => {
		const recognizer = pinchingRecognizer();

		expect(recognizer.down(finger(THIRD, 200, 300))).toEqual(REFUSED);
		expect(recognizer.move(finger(THIRD, 200, 400))).toBeNull();
	});

	it("starts no two finger gesture when the first pointer is a mouse", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 100, 100));

		expect(recognizer.down(finger(SECOND, 300, 100))).toEqual(REFUSED);
		expect(recognizer.move(finger(SECOND, 400, 100))).toBeNull();
	});

	it("starts no two finger gesture when the second pointer is a mouse", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(finger(PRIMARY, 100, 100));

		expect(recognizer.down(at(SECOND, 300, 100))).toEqual(REFUSED);
	});
});

describe("GestureRecognizer double tap", () => {
	it("reports a double tap when a second tap lands soon and near the first", () => {
		const recognizer = new GestureRecognizer();

		expect(tapAt(recognizer, 10, 1000)).toMatchObject({ kind: "tap" });
		expect(tapAt(recognizer, 12, 1300)).toEqual({ kind: "doubleTap", point: { x: 12, y: 10 } });
		expect(tapAt(recognizer, 12, 1400)).toMatchObject({ kind: "tap" });
	});

	it("reports two taps when the second tap is late or far", () => {
		const recognizer = new GestureRecognizer();

		tapAt(recognizer, 10, 1000);
		expect(tapAt(recognizer, 10, 1600)).toMatchObject({ kind: "tap" });
		expect(tapAt(recognizer, 40, 1700)).toMatchObject({ kind: "tap" });
	});

	it("reports a tap after a drag that came between two taps", () => {
		const recognizer = new GestureRecognizer();
		tapAt(recognizer, 10, 1000);
		recognizer.down(at(PRIMARY, 10, 10, 1100));
		recognizer.move(at(PRIMARY, 40, 30, 1150));
		recognizer.up(at(PRIMARY, 40, 30, 1200));

		expect(tapAt(recognizer, 10, 1300)).toMatchObject({ kind: "tap" });
	});
});

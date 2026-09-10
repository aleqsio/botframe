import { describe, expect, it } from "vitest";
import { GestureRecognizer } from "./gesture";
import type { PointerSample } from "./gesture";

const PRIMARY = 1;
const SECOND = 2;

function at(pointerId: number, x: number, y: number): PointerSample {
	return { pointerId, x, y };
}

function draggingRecognizer(): GestureRecognizer {
	const recognizer = new GestureRecognizer();
	recognizer.down(at(PRIMARY, 10, 10));
	recognizer.move(at(PRIMARY, 40, 30));
	return recognizer;
}

describe("GestureRecognizer", () => {
	it("takes the first pointer down and keeps quiet inside the tap limit", () => {
		const recognizer = new GestureRecognizer();

		expect(recognizer.down(at(PRIMARY, 10, 10))).toBe(true);
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

		expect(recognizer.up(at(PRIMARY, 200, 200))).toEqual({ kind: "tap" });
	});

	it("reports a tap when the pointer stays inside the tap limit", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));
		recognizer.move(at(PRIMARY, 12, 11));

		expect(recognizer.up(at(PRIMARY, 12, 11))).toEqual({ kind: "tap" });
	});

	it("reports no tap when the press is cancelled", () => {
		const recognizer = new GestureRecognizer();
		recognizer.down(at(PRIMARY, 10, 10));

		expect(recognizer.cancel(at(PRIMARY, 10, 10))).toBeNull();
	});

	it("ignores a second pointer while it tracks the first", () => {
		const recognizer = draggingRecognizer();

		expect(recognizer.down(at(SECOND, 200, 200))).toBe(false);
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

	it("keeps the drag of the first pointer while a second pointer rests on the glass", () => {
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

		expect(recognizer.down(at(SECOND, 200, 200))).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import { blockPageZoom } from "./pageZoom";

function wheel(ctrlKey: boolean): Event {
	return Object.assign(new Event("wheel", { cancelable: true }), { ctrlKey });
}

function cancels(target: EventTarget, event: Event): boolean {
	return !target.dispatchEvent(event);
}

describe("blockPageZoom", () => {
	it("cancels a pinch on the page", () => {
		const page = new EventTarget();
		blockPageZoom(page, new EventTarget());
		expect(cancels(page, wheel(true))).toBe(true);
	});

	it("keeps a scroll on the page", () => {
		const page = new EventTarget();
		blockPageZoom(page, new EventTarget());
		expect(cancels(page, wheel(false))).toBe(false);
	});

	it("cancels a sideways swipe on the stage", () => {
		const stage = new EventTarget();
		blockPageZoom(new EventTarget(), stage);
		expect(cancels(stage, wheel(false))).toBe(true);
	});

	it("cancels a Safari gesture", () => {
		const page = new EventTarget();
		blockPageZoom(page, new EventTarget());
		expect(cancels(page, new Event("gesturestart", { cancelable: true }))).toBe(true);
	});

	it("stops when the stage unmounts", () => {
		const page = new EventTarget();
		const stage = new EventTarget();
		blockPageZoom(page, stage)();
		expect([cancels(page, wheel(true)), cancels(stage, wheel(false))]).toEqual([false, false]);
	});
});

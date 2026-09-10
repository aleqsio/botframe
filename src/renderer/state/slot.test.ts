import { describe, expect, it, vi } from "vitest";
import { Slot } from "./slot";

describe("Slot", () => {
	it("gives the value it holds", () => {
		expect(new Slot(7).get()).toBe(7);
	});

	it("tells each listener when the value changes", () => {
		const slot = new Slot("a");
		const first = vi.fn<() => void>();
		const second = vi.fn<() => void>();
		slot.subscribe(first);
		slot.subscribe(second);

		slot.set("b");

		expect(slot.get()).toBe("b");
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("stays quiet when the next value is the same value", () => {
		const camera = { x: 0, y: 0, zoom: 1 };
		const slot = new Slot(camera);
		const listener = vi.fn<() => void>();
		slot.subscribe(listener);

		slot.set(camera);

		expect(listener).not.toHaveBeenCalled();
	});

	it("stops the listener when the caller unsubscribes", () => {
		const slot = new Slot(0);
		const listener = vi.fn<() => void>();
		const unsubscribe = slot.subscribe(listener);

		slot.set(1);
		unsubscribe();
		slot.set(2);

		expect(slot.get()).toBe(2);
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

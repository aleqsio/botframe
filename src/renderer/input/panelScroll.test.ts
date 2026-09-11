import { describe, expect, it } from "vitest";
import { scrollStepOf } from "./panelScroll";
import type { ScrollView } from "./panelScroll";

const PANEL: ScrollView = { pointer: 200, height: 400, scrollTop: 100, scrollHeight: 1600 };

function at(pointer: number, more: Partial<ScrollView> = {}): number {
	return scrollStepOf({ ...PANEL, pointer, ...more });
}

describe("scrollStepOf", () => {
	it("gives no step away from the two edges", () => {
		expect(at(200)).toBe(0);
		expect(at(36)).toBe(0);
		expect(at(364)).toBe(0);
	});

	it("gives no step when the list is not longer than the panel", () => {
		expect(at(2, { scrollHeight: 400 })).toBe(0);
		expect(at(398, { scrollHeight: 300 })).toBe(0);
	});

	it("goes up near the top edge and down near the bottom edge", () => {
		expect(at(18)).toBeLessThan(0);
		expect(at(382)).toBeGreaterThan(0);
	});

	it("grows as the pointer comes closer to the edge", () => {
		expect(at(6)).toBeLessThan(at(30));
		expect(at(394)).toBeGreaterThan(at(370));
	});

	it("holds the speed after the pointer passes the edge of the panel", () => {
		expect(at(-50)).toBe(at(0));
		expect(at(450)).toBe(at(400));
	});

	it("stops at the start of the list", () => {
		expect(at(4, { scrollTop: 0 })).toBe(0);
		expect(at(4, { scrollTop: 3 })).toBe(-3);
	});

	it("stops at the end of the list", () => {
		expect(at(396, { scrollTop: 1200 })).toBe(0);
		expect(at(396, { scrollTop: 1195 })).toBe(5);
	});
});

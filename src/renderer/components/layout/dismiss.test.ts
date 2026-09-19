import { describe, expect, it } from "vitest";
import { dismissPlan } from "./dismiss";
import type { Zone } from "./dismiss";

const TARGET: Zone = { contains: () => false };
const DRAFT: Zone = { contains: () => false };
const ELSEWHERE: Zone = { contains: () => false };

function editor(held: readonly Zone[]): Zone {
	return { contains: (node) => node !== null && held.includes(node) };
}

describe("dismissPlan", () => {
	it("keeps the editor open for a pointer down inside it", () => {
		expect(
			dismissPlan({ active: DRAFT, inMenu: false, root: editor([TARGET, DRAFT]), target: TARGET }),
		).toEqual({ blur: false, dismiss: false });
	});

	it("keeps the editor open for a pointer down in the unit menu", () => {
		expect(
			dismissPlan({ active: DRAFT, inMenu: true, root: editor([DRAFT]), target: TARGET }),
		).toEqual({ blur: false, dismiss: false });
	});

	it("blurs the field of the editor before it closes on a pointer down outside", () => {
		expect(
			dismissPlan({ active: DRAFT, inMenu: false, root: editor([DRAFT]), target: TARGET }),
		).toEqual({ blur: true, dismiss: true });
	});

	it("closes without a blur when the focus is outside the editor", () => {
		expect(
			dismissPlan({ active: ELSEWHERE, inMenu: false, root: editor([]), target: TARGET }),
		).toEqual({ blur: false, dismiss: true });
	});

	it("closes without a blur when no element holds the focus", () => {
		expect(dismissPlan({ active: null, inMenu: false, root: editor([]), target: TARGET })).toEqual({
			blur: false,
			dismiss: true,
		});
	});

	it("does nothing before the editor holds an element", () => {
		expect(dismissPlan({ active: DRAFT, inMenu: false, root: null, target: TARGET })).toEqual({
			blur: false,
			dismiss: false,
		});
	});
});

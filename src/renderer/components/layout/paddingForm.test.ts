import { describe, expect, it } from "vitest";
import { spreadSides } from "./paddingForm";

describe("spreadSides", () => {
	it("writes one value on each side", () => {
		expect(spreadSides({ value: 16, unit: "px" })).toEqual({
			top: { value: 16, unit: "px" },
			right: { value: 16, unit: "px" },
			bottom: { value: 16, unit: "px" },
			left: { value: 16, unit: "px" },
		});
	});
});

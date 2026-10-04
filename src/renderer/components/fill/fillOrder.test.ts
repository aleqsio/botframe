import { describe, expect, it } from "vitest";
import { stackAt } from "./fillOrder";

describe("stackAt", () => {
	it("puts the media over the paint when the media row goes above the paint row", () => {
		expect(stackAt("media", true)).toBe("over");
		expect(stackAt("media", false)).toBe("under");
	});

	it("puts the media under the paint when the paint row goes above the media row", () => {
		expect(stackAt("paint", true)).toBe("under");
		expect(stackAt("paint", false)).toBe("over");
	});
});

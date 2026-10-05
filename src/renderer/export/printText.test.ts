import { describe, expect, it } from "vitest";
import { textColorOf } from "./printText";

describe("textColorOf", () => {
	it("prints a text with a solid fill in its color", () => {
		expect(textColorOf({ backgroundColor: "rgb(51, 102, 204)", backgroundImage: "none" })).toBe(
			"rgb(51, 102, 204)",
		);
	});

	it("prints a text with a gradient or an image fill as a picture", () => {
		expect(
			textColorOf({
				backgroundColor: "rgba(0, 0, 0, 0)",
				backgroundImage: "radial-gradient(rgb(187, 0, 0) 0%, rgb(6, 255, 118) 100%)",
			}),
		).toBeNull();
	});
});

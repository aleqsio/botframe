import { describe, expect, it } from "vitest";
import type { GoogleFamily } from "./googleFonts";
import { cssUrl, nearestWeight } from "./googleFonts";
import { matchingFamilies, weightChoices } from "./fontSearch";

function family(name: string, weights: readonly number[], variable = false): GoogleFamily {
	return { family: name, category: "serif", weights, italic: false, variable };
}

const ROBOTO_SLAB = family("Roboto Slab", [100, 900], true);
const ROBOTO = family("Roboto", [100, 900], true);
const GROBOT = family("Grobot", [400, 700]);

describe("matchingFamilies", () => {
	it("gives the exact name first, then the names that start with the search", () => {
		expect(
			matchingFamilies([GROBOT, ROBOTO_SLAB, ROBOTO], "roboto").map((held) => held.family),
		).toEqual(["Roboto", "Roboto Slab"]);
		expect(matchingFamilies([GROBOT, ROBOTO], "robo").map((held) => held.family)).toEqual([
			"Roboto",
			"Grobot",
		]);
	});
});

describe("the weights of a family", () => {
	it("gives each hundred on the axis of a variable font, and the files of a static font", () => {
		expect(weightChoices(family("Thin", [250, 620], true))).toEqual([300, 400, 500, 600]);
		expect(weightChoices(GROBOT)).toEqual([400, 700]);
	});

	it("moves a weight to the nearest weight that the family has", () => {
		expect(nearestWeight(GROBOT, 500)).toBe(400);
		expect(nearestWeight(GROBOT, 600)).toBe(700);
		expect(nearestWeight(ROBOTO, 950)).toBe(900);
	});
});

describe("cssUrl", () => {
	it("asks for the whole axis of a variable font, and for one file of a static font", () => {
		expect(cssUrl(ROBOTO_SLAB, true, 400)).toBe(
			"https://fonts.googleapis.com/css2?family=Roboto+Slab:ital,wght@0,100..900",
		);
		expect(cssUrl({ ...GROBOT, italic: true }, true, 650)).toBe(
			"https://fonts.googleapis.com/css2?family=Grobot:ital,wght@1,700",
		);
	});
});

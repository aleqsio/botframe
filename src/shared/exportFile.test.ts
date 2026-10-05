import { describe, expect, it } from "vitest";
import { exportFileNames, uniqueNames } from "./exportFile";

describe("uniqueNames", () => {
	it("gives each file a different name, with no regard to case", () => {
		expect(uniqueNames(["Layer", "Layer", "Layer 2", "card", "Card"])).toEqual([
			"Layer",
			"Layer 2",
			"Layer 2 2",
			"card",
			"Card 2",
		]);
	});
});

describe("exportFileNames", () => {
	it("adds the extension of each format to a unique name", () => {
		const bytes = new Uint8Array();
		expect(
			exportFileNames([
				{ name: "Card", format: "png", bytes },
				{ name: "Card", format: "pdf", bytes },
				{ name: "Page", format: "zip", bytes },
			]),
		).toEqual(["Card.png", "Card 2.pdf", "Page.zip"]);
	});
});

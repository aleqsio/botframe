import { describe, expect, it } from "vitest";
import { uniqueNames } from "./fileNames";

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

import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { firstId } from "../../../document/documentFixtures";
import { hugPatch } from "./SizeRow";

describe("hugPatch", () => {
	it("moves a Block layer to Row when an axis starts to hug", () => {
		const doc = DesignDocument.create();
		const layer = doc.layer(firstId(doc));
		if (layer === null) {
			throw new Error("no layer");
		}

		expect(hugPatch(layer, "width", "hug")).toEqual({ width: "hug", display: "row" });
		expect(hugPatch(layer, "height", "fill")).toEqual({ height: "fill" });
		expect(
			hugPatch({ ...layer, layout: { ...layer.layout, display: "grid" } }, "width", "hug"),
		).toEqual({ width: "hug" });
	});
});

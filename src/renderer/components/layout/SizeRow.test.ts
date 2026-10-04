import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { firstId } from "../../../document/documentFixtures";
import { DEFAULT_TEXT_STYLE } from "../../../document/text";
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

	it("leaves the display of a text layer alone, because the text box sets its own layout", () => {
		const doc = DesignDocument.create();
		const layer = doc.layer(firstId(doc));
		if (layer === null) {
			throw new Error("no layer");
		}
		const text = {
			...layer,
			geometry: { kind: "text", content: "Hi", ...DEFAULT_TEXT_STYLE },
		} as const;

		expect(hugPatch(text, "width", "hug")).toEqual({ width: "hug" });
	});
});

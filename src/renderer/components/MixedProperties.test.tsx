import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, WritableGeometry } from "../../document/layer";
import { DEFAULT_TEXT_STYLE } from "../../document/text";
import { MixedProperties } from "./MixedProperties";

const PLAIN: WritableGeometry = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: false,
};

const BOX: LayerFields = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: PLAIN,
};

function markupOf(geometries: readonly WritableGeometry[]): string {
	const doc = DesignDocument.create();
	const layers = geometries.flatMap(
		(geometry) => doc.layer(doc.createLayer({ ...BOX, geometry })) ?? [],
	);
	return renderToStaticMarkup(<MixedProperties doc={doc} layers={layers} />);
}

describe("MixedProperties", () => {
	it("gives the clip switch only when a selected layer can clip its content", () => {
		const text = { ...DEFAULT_TEXT_STYLE, kind: "text", content: "Hi" } as const;

		expect(markupOf([PLAIN, { kind: "ellipse" }])).not.toContain("Clip content");
		expect(markupOf([PLAIN, { kind: "group" }])).toContain("Clip content");
		expect(markupOf([PLAIN, text])).toContain("Clip content");
	});
});

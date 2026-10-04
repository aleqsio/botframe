import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { makeVariable } from "../variables/scopeEdit";
import { colorSwatches, documentSwatches } from "./DocumentPaints";

describe("documentSwatches", () => {
	it("shows a color that refers to an other color with the value it reaches", () => {
		const doc = DesignDocument.create();
		const base = makeVariable(doc, DOCUMENT_SCOPE, {
			name: "red",
			type: "color",
			initial: "#ff0000",
			options: [],
		});
		const alias = makeVariable(doc, DOCUMENT_SCOPE, {
			name: "alarm",
			type: "color",
			initial: { var: base },
			options: [],
		});
		doc.commit("add colors");

		const reach = { view: doc.components.view(), source: doc.tree.resolver() };

		expect(documentSwatches(reach, "solid")).toEqual([
			{ key: alias, label: "alarm", paint: "#ff0000" },
			{ key: base, label: "red", paint: "#ff0000" },
		]);
	});
});

describe("colorSwatches", () => {
	it("shows each document color one time, with a gradient and custom CSS, in name order", () => {
		const doc = DesignDocument.create();
		const add = (name: string, initial: string): string =>
			makeVariable(doc, DOCUMENT_SCOPE, { name, type: "color", initial, options: [] });
		const sky = add("sky", "linear-gradient(180deg, #d7e8f5 0%, #ffffff 100%)");
		const ink = add("ink", "#14131b");
		const odd = add("odd", "radial-gradient(circle, red, blue)");
		makeVariable(doc, DOCUMENT_SCOPE, { name: "title", type: "text", initial: "Hi", options: [] });
		doc.commit("add variables");

		const reach = { view: doc.components.view(), source: doc.tree.resolver() };

		expect(colorSwatches(reach).map((swatch) => swatch.key)).toEqual([ink, odd, sky]);
	});
});

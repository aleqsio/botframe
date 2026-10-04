import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { makeVariable } from "../variables/scopeEdit";
import { documentSwatches } from "./DocumentPaints";

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

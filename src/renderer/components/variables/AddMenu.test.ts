import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { VALUE_TYPES, variableChoices } from "./AddMenu";

describe("the document variable choices", () => {
	it("leave the color to the fills", () => {
		const doc = DesignDocument.create();

		const names = variableChoices(doc, DOCUMENT_SCOPE, () => {}, VALUE_TYPES).map(
			(choice) => choice.name,
		);

		expect(names).toEqual(["Choice", "Switch", "Text", "Length", "Number"]);
	});

	it("give the new variable to the caller", () => {
		const doc = DesignDocument.create();
		const added: string[] = [];

		variableChoices(
			doc,
			DOCUMENT_SCOPE,
			(id) => {
				added.push(id);
			},
			VALUE_TYPES,
		)[0]?.pick();

		expect(
			doc.components
				.scope(DOCUMENT_SCOPE)
				.variables()
				.map((held) => held.id),
		).toEqual(added);
	});
});

import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import { fileBytes, readFile } from "./file";

describe("the .botframe file", () => {
	it("gives back each layer after a save and an open", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.commit("create frame");

		const reopened = readFile(fileBytes(doc));

		expect(reopened?.layerIds()).toEqual(doc.layerIds());
		expect(reopened?.layer(id)).toEqual(doc.layer(id));
	});

	it("starts with the name and the version of the format", () => {
		const bytes = fileBytes(DesignDocument.create());

		expect(new TextDecoder().decode(bytes.subarray(0, 8))).toBe("botframe");
		expect(bytes[8]).toBe(1);
	});

	it("refuses a file with no header", () => {
		expect(readFile(DesignDocument.create().snapshot())).toBeNull();
	});

	it("refuses a file from a version that it does not know", () => {
		const bytes = fileBytes(DesignDocument.create());
		bytes[8] = 2;

		expect(readFile(bytes)).toBeNull();
	});

	it("refuses a file with a damaged body", () => {
		const bytes = fileBytes(DesignDocument.create());

		expect(readFile(bytes.subarray(0, 12))).toBeNull();
	});
});

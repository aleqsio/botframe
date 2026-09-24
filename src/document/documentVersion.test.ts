import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";

describe("the version of a document", () => {
	it("moves with each commit, also for two commits with one message", () => {
		const doc = DesignDocument.create();
		const start = doc.version();
		const id = doc.createLayer(DRAWN);
		doc.commit("edit");
		const drawn = doc.version();
		doc.update(id, { x: 5 });
		doc.commit("edit");

		expect(drawn).not.toBe(start);
		expect(doc.version()).not.toBe(drawn);
	});

	it("stays the same when nothing changes", () => {
		const doc = DesignDocument.create();

		expect(doc.version()).toBe(doc.version());
	});
});

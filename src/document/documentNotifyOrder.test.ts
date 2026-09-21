import { LoroDoc } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";

function recorder(): { calls: string[]; record: (name: string) => () => void } {
	const calls: string[] = [];
	return {
		calls,
		record: (name) => () => {
			calls.push(name);
		},
	};
}

describe("DesignDocument notify order contract", () => {
	it("notifies the layer listener before the change listener when a layer updates", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const { calls, record } = recorder();
		doc.subscribeChanges(record("change"));
		doc.subscribeLayer(id, record("layer"));

		doc.update(id, { x: 1, y: 2 });

		expect(calls).toEqual(["layer", "change"]);
	});

	it("notifies the structure listener before the change listener when the tree changes", () => {
		const doc = DesignDocument.create();
		const { calls, record } = recorder();
		doc.subscribeChanges(record("change"));
		doc.subscribeStructure(record("structure"));

		doc.createLayer(DRAWN);

		expect(calls).toEqual(["structure", "change"]);
	});

	it("notifies the change listener after the last layer and structure listener on undo", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { x: 1, y: 2 });
		doc.commit("move layer");
		const { calls, record } = recorder();
		doc.subscribeChanges(record("change"));
		doc.subscribeStructure(record("structure"));
		doc.subscribeLayer(id, record("layer"));

		expect(doc.undo()).toBe(true);

		expect(calls.indexOf("layer")).toBeGreaterThanOrEqual(0);
		expect(calls.indexOf("structure")).toBeGreaterThanOrEqual(0);
		expect(calls.lastIndexOf("change")).toBeGreaterThan(calls.lastIndexOf("layer"));
		expect(calls.lastIndexOf("change")).toBeGreaterThan(calls.lastIndexOf("structure"));
	});

	it("notifies the change listener after the layer listener when a remote peer moves the layer", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const { calls, record } = recorder();
		doc.subscribeChanges(record("change"));
		doc.subscribeLayer(id, record("layer"));
		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		peer.getTree("layers").getNodeByID(id)?.data.set("x", 777);
		peer.commit();

		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(calls).toContain("layer");
		});
		expect(calls.lastIndexOf("change")).toBeGreaterThan(calls.lastIndexOf("layer"));
	});

	it("runs a change listener that waits for a microtask after the synchronous layer listener", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const { calls, record } = recorder();
		doc.subscribeChanges(() => {
			queueMicrotask(record("change after commit"));
		});
		doc.subscribeLayer(id, record("layer"));

		doc.update(id, { x: 1, y: 2 });

		expect(calls).toEqual(["layer"]);
		await Promise.resolve();
		expect(calls).toEqual(["layer", "change after commit"]);
	});
});

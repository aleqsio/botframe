import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";

type Listener = "layer" | "structure" | "change";

function recordOrder(doc: DesignDocument): Listener[] {
	const order: Listener[] = [];
	doc.subscribeChanges(() => {
		order.push("change");
	});
	doc.subscribeStructure(() => {
		order.push("structure");
	});
	doc.subscribeLayer(firstId(doc), () => {
		order.push("layer");
	});
	return order;
}

describe("the notify order that the overlay depends on", () => {
	it("notifies the layer listener before the change listener, so React paints the layer before the overlay reads the DOM", () => {
		const doc = DesignDocument.create();
		const order = recordOrder(doc);

		doc.update(firstId(doc), { x: 1 });

		expect(order).toEqual(["layer", "change"]);
	});

	it("notifies a listener that React flushes before the first change listener when the tree changes", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const order = recordOrder(doc);

		doc.move(firstId(doc), parent);

		expect(order.indexOf("change")).toBeGreaterThan(0);
		expect(order).toContain("structure");
	});
});

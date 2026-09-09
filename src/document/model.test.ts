import { describe, expect, it } from "vitest";
import { commitMove, createDocument, getRectangle, listRectangles, setPosition } from "./model";
import type { LayerId } from "./model";

function firstId(doc: ReturnType<typeof createDocument>): LayerId {
	const [rectangle] = listRectangles(doc);
	if (rectangle === undefined) {
		throw new Error("document has no rectangle");
	}
	return rectangle.id;
}

describe("document model", () => {
	it("starts with one black rectangle", () => {
		const rectangles = listRectangles(createDocument());
		expect(rectangles).toHaveLength(1);
		expect(rectangles[0]).toMatchObject({ fill: "#000000", width: 240, height: 160 });
	});

	it("reads a position back before it is committed", () => {
		const doc = createDocument();
		const id = firstId(doc);
		setPosition(doc, id, 11, 22);
		expect(getRectangle(doc, id)).toMatchObject({ x: 11, y: 22 });
	});

	it("records one change per drag, not one per move", () => {
		const doc = createDocument();
		const id = firstId(doc);
		const before = doc.exportJsonUpdates().changes.length;
		for (let step = 0; step < 200; step += 1) {
			setPosition(doc, id, step, step * 2);
		}
		commitMove(doc);
		expect(doc.exportJsonUpdates().changes.length).toBe(before + 1);
		expect(getRectangle(doc, id)).toMatchObject({ x: 199, y: 398 });
	});

	it("keeps the moved position in an exported and reimported snapshot", async () => {
		const doc = createDocument();
		const id = firstId(doc);
		setPosition(doc, id, 640, 480);
		commitMove(doc);
		const { LoroDoc } = await import("loro-crdt");
		const restored = new LoroDoc();
		restored.import(doc.export({ mode: "snapshot" }));
		expect(listRectangles(restored)[0]).toMatchObject({ x: 640, y: 480 });
	});
});

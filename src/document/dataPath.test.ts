import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";

describe("document data paths", () => {
	it("reads each root container with its kind", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(doc.readData([])).toMatchObject({
			layers: { $tree: [{ id, data: { $map: { fill: "#000000" } }, children: [] }] },
		});
	});

	it("reads one field of a layer through its tree node", () => {
		const doc = DesignDocument.create();
		expect(doc.readData(["layers", firstId(doc), "geometry", "kind"])).toBe("rectangle");
	});

	it("writes a layer field, and the model reads it after the commit", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.writeData(["layers", id, "fill"], "#ff0000");
		doc.commit("raw fill");
		expect(doc.layer(id)?.fill).toBe("#ff0000");
		expect(doc.undo()).toBe(true);
		expect(doc.layer(id)?.fill).toBe("#000000");
	});

	it("merges a map value into the map that the path holds", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.writeData(["layers", id, "geometry", "rectangle"], { $map: { cornerRadius: 12 } });
		doc.commit("raw radius");
		expect(doc.layer(id)?.geometry).toMatchObject({ kind: "rectangle", cornerRadius: 12 });
	});

	it("makes map and list containers from marked values", () => {
		const doc = DesignDocument.create();
		doc.writeData(["scope", "notes"], { $map: { tags: { $list: ["a", { $map: { b: 1 } }] } } });
		expect(doc.readData(["scope", "notes"])).toEqual({
			$map: { tags: { $list: ["a", { $map: { b: 1 } }] } },
		});
	});

	it("writes and deletes inside a plain value", () => {
		const doc = DesignDocument.create();
		doc.writeData(["scope", "plain"], { a: [1, 2, 3], b: true });
		doc.writeData(["scope", "plain", "a", 1], 20);
		doc.deleteData(["scope", "plain", "b"]);
		expect(doc.readData(["scope", "plain"])).toEqual({ a: [1, 20, 3] });
		doc.deleteData(["scope", "plain", "a", 0]);
		expect(doc.readData(["scope", "plain", "a"])).toEqual([20, 3]);
	});

	it("deletes a map key", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.deleteData(["layers", id, "fill"]);
		doc.commit("raw delete");
		expect(doc.readData(["layers", id, "fill"])).toBeUndefined();
	});

	it("refuses to replace a container with a plain value", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(() => {
			doc.writeData(["layers", id, "geometry"], "circle");
		}).toThrow(/holds a container/u);
	});

	it("refuses to replace a tree node, a root container, or a root", () => {
		const doc = DesignDocument.create();
		expect(() => {
			doc.writeData(["layers", firstId(doc)], 1);
		}).toThrow(/holds a container/u);
		expect(() => {
			doc.deleteData(["layers", firstId(doc)]);
		}).toThrow(/delete_layers/u);
		expect(() => {
			doc.writeData(["scope"], 1);
		}).toThrow(/holds a container/u);
		expect(() => {
			doc.writeData(["notes"], 1);
		}).toThrow(/map key or a list index/u);
	});

	it("refuses an index that is not a number", () => {
		const doc = DesignDocument.create();
		doc.writeData(["scope", "list"], { $list: [1] });
		expect(() => {
			doc.writeData(["scope", "list", "first"], 2);
		}).toThrow(/not a list index/u);
	});
});

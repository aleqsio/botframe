import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import type { Geometry } from "./layer";
import { NO_OFFSET, editableVertices, verticesOf } from "./vertices";
import type { Vertex } from "./vertices";

const SIZE = { width: 200, height: 100 };
const PLAIN = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false } as const;

function corner(x: number, y: number): Vertex {
	return { x, y, before: NO_OFFSET, after: NO_OFFSET };
}

function editedOf(geometry: Geometry): readonly Vertex[] {
	const vertices = editableVertices(geometry, SIZE);
	if (vertices === null) {
		throw new Error("the geometry has no vertices");
	}
	return vertices;
}

describe("verticesOf", () => {
	it("reads each vertex with a finite place and gives a zero handle for a lost handle", () => {
		expect(
			verticesOf([
				{ x: 0.5, y: 0, before: { x: -0.1, y: 0 }, after: { x: "far" } },
				{ x: Number.NaN, y: 1 },
				"vertex",
			]),
		).toEqual([{ x: 0.5, y: 0, before: { x: -0.1, y: 0 }, after: NO_OFFSET }]);
	});

	it("reads a value that is not a list as no vertices", () => {
		expect(verticesOf("M0 0 L1 1 Z")).toEqual([]);
	});
});

describe("editableVertices", () => {
	it("gives the four corners of a plain rectangle", () => {
		expect(editableVertices(PLAIN, SIZE)).toEqual([
			corner(0, 0),
			corner(1, 0),
			corner(1, 1),
			corner(0, 1),
		]);
	});

	it("gives two vertices for each round corner, in the unit box", () => {
		const vertices = editedOf({ ...PLAIN, cornerRadius: 20 });
		expect(vertices).toHaveLength(8);
		expect(vertices[0]).toMatchObject({ x: 0, y: 0.2, before: NO_OFFSET });
		expect(vertices[1]).toMatchObject({ x: 0.1, y: 0, after: NO_OFFSET });
		expect(vertices[0]?.after.y).toBeCloseTo(-0.2 * 0.5523);
		expect(vertices[1]?.before.x).toBeCloseTo(-0.1 * 0.5523);
	});

	it("gives four smooth vertices for an ellipse", () => {
		const vertices = editedOf({ kind: "ellipse" });
		expect(vertices.map(({ x, y }) => ({ x, y }))).toEqual([
			{ x: 0, y: 0.5 },
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0.5 },
			{ x: 0.5, y: 1 },
		]);
		expect(vertices[1]?.before.x).toBeCloseTo(-0.5 * 0.5523);
		expect(vertices[1]?.after.x).toBeCloseTo(0.5 * 0.5523);
	});

	it("gives the vertices of a path and nothing for a frame or an unknown shape", () => {
		const vertices = verticesOf([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
		]);
		expect(editableVertices({ kind: "path", vertices }, SIZE)).toBe(vertices);
		expect(editableVertices({ ...PLAIN, frame: true }, SIZE)).toBeNull();
		expect(editableVertices({ kind: "unsupported" }, SIZE)).toBeNull();
	});
});

describe("path geometry in the document", () => {
	it("keeps the vertices after a write, an undo, and a redo", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(
			{ x: 0, y: 0, ...SIZE, fill: "#000000", name: "", clip: false, geometry: PLAIN },
			null,
		);
		doc.commit("draw");
		const vertices = verticesOf([
			{ x: 0.5, y: 0, before: { x: -0.2, y: 0 }, after: { x: 0.2, y: 0 } },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
		]);
		doc.update(id, { geometry: { kind: "path", vertices } });
		doc.commit("edit path");

		expect(doc.layer(id)?.geometry).toEqual({ kind: "path", vertices });
		doc.undo();
		expect(doc.layer(id)?.geometry).toEqual(PLAIN);
		doc.redo();
		expect(doc.layer(id)?.geometry).toEqual({ kind: "path", vertices });
	});
});

import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import type { LayoutPatch } from "../../document/layout";
import { flipLayer } from "./flip";
import type { FlipScope } from "./flip";
import { verticesOf } from "../../document/vertices";

const FRAME: LayerFields = {
	x: 0,
	y: 0,
	width: 300,
	height: 200,
	fill: "#ffffff",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
};

const PATH = {
	kind: "path",
	vertices: verticesOf([
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
	]),
} as const;

interface Scene {
	scope: FlipScope;
	frame: LayerId;
	children: readonly LayerId[];
}

function sceneOf(layout: LayoutPatch, widths: readonly number[]): Scene {
	const doc = DesignDocument.create();
	doc.deleteLayer(firstId(doc));
	const frame = doc.createLayer(FRAME);
	doc.update(frame, { layout });
	const children = widths.map((width, index) =>
		doc.createLayer({ ...FRAME, x: 10 + index * 60, y: 10, width, height: 20 }, frame),
	);
	doc.commit("scene");
	return { scope: { doc, read: (id) => doc.layer(id) }, frame, children };
}

function layerOf({ scope }: Scene, id: LayerId): Layer {
	const layer = scope.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function flip(scene: Scene, axis: "x" | "y"): Layer {
	flipLayer(scene.scope, layerOf(scene, scene.frame), [axis]);
	return layerOf(scene, scene.frame);
}

describe("flipLayer", () => {
	it("moves each child of a block frame to the other side of the frame", () => {
		const scene = sceneOf({}, [40, 50]);

		expect(flip(scene, "x").mirrored).toBe(false);

		expect(scene.children.map((id) => layerOf(scene, id).x)).toEqual([250, 180]);
	});

	it("reverses the children of a row and swaps its padding and its main alignment", () => {
		const scene = sceneOf(
			{
				display: "row",
				padding: {
					top: { value: 0, unit: "px" },
					right: { value: 0, unit: "px" },
					bottom: { value: 0, unit: "px" },
					left: { value: 16, unit: "px" },
				},
			},
			[40, 50, 60],
		);

		const frame = flip(scene, "x");

		expect(scene.scope.doc.childIds(scene.frame)).toEqual(scene.children.toReversed());
		expect(frame.layout.padding.right).toEqual({ value: 16, unit: "px" });
		expect(frame.layout.padding.left).toEqual({ value: 0, unit: "px" });
		expect(frame.layout.align.main).toBe("end");
		expect(frame.mirrored).toBe(false);
	});

	it("keeps the order of a row on a vertical flip and swaps its cross alignment", () => {
		const scene = sceneOf({ display: "row" }, [40, 50]);

		const frame = flip(scene, "y");

		expect(scene.scope.doc.childIds(scene.frame)).toEqual(scene.children);
		expect(frame.layout.align.cross).toBe("end");
		expect(frame.layout.align.main).toBe("start");
	});

	it("swaps the cross alignment of a column on a horizontal flip", () => {
		const scene = sceneOf({ display: "column", align: { main: "start", cross: "end" } }, [40]);

		expect(flip(scene, "x").layout.align).toEqual({ main: "start", cross: "start" });
	});

	it("swaps the left and right margin of each child", () => {
		const scene = sceneOf({ display: "column" }, [40]);
		const [child = scene.frame] = scene.children;
		const margin = {
			...layerOf(scene, child).layout.margin,
			left: { value: 8, unit: "px" as const },
		};
		scene.scope.doc.update(child, { layout: { margin } });

		flip(scene, "x");

		expect(layerOf(scene, child).layout.margin.right).toEqual({ value: 8, unit: "px" });
	});

	it("reverses the columns of a grid and mirrors the cell of each child", () => {
		const scene = sceneOf({ display: "grid" }, [40]);
		const [child = scene.frame] = scene.children;
		const tracks = {
			columns: [
				{ value: 1, unit: "fr" },
				{ value: 100, unit: "px" },
				{ value: 2, unit: "fr" },
			],
			rows: [{ value: 1, unit: "fr" }],
		} as const;
		scene.scope.doc.update(scene.frame, { layout: { tracks } });
		const cell = {
			mode: "place",
			column: { start: 1, end: 3 },
			row: { start: 1, end: 2 },
		} as const;
		scene.scope.doc.update(child, { layout: { cell } });

		const frame = flip(scene, "x");

		expect(frame.layout.tracks.columns).toEqual(tracks.columns.toReversed());
		expect(layerOf(scene, child).layout.cell).toEqual({ ...cell, column: { start: 2, end: 4 } });
		expect(frame.mirrored).toBe(false);
	});

	it("mirrors a grid that places a child by itself, because no property holds the mirror", () => {
		const scene = sceneOf({ display: "grid" }, [40]);

		expect(flip(scene, "x").mirrored).toBe(true);
	});

	it("mirrors a grid with a child past the last track, because no property holds the mirror", () => {
		const scene = sceneOf({ display: "grid" }, [40]);
		const [child = scene.frame] = scene.children;
		const cell = {
			mode: "place",
			column: { start: 4, end: 5 },
			row: { start: 1, end: 2 },
		} as const;
		scene.scope.doc.update(child, { layout: { cell } });

		expect(flip(scene, "x").mirrored).toBe(true);
		expect(layerOf(scene, child).layout.cell).toEqual(cell);
	});

	it("mirrors a row whose path child turns about a point away from its middle", () => {
		const scene = sceneOf({ display: "row" }, [40]);
		const [child = scene.frame] = scene.children;
		scene.scope.doc.update(child, { geometry: PATH, origin: { x: 0.2 } });

		expect(flip(scene, "x").mirrored).toBe(true);
	});

	it("mirrors only the path child of a row when the path turns about its middle", () => {
		const scene = sceneOf({ display: "row" }, [40]);
		const [child = scene.frame] = scene.children;
		scene.scope.doc.update(child, { geometry: PATH });

		expect(flip(scene, "x").mirrored).toBe(false);
		expect(layerOf(scene, child).mirrored).toBe(true);
	});

	it("mirrors a row that wraps, because no property holds the mirror", () => {
		const scene = sceneOf({ display: "row", wrap: true }, [40]);

		expect(flip(scene, "x").mirrored).toBe(true);
	});

	it("mirrors a path child and moves it to the other side of the frame", () => {
		const scene = sceneOf({}, [40]);
		const [child = scene.frame] = scene.children;
		scene.scope.doc.update(child, { geometry: PATH });

		flip(scene, "x");

		expect(layerOf(scene, child)).toMatchObject({ x: 250, mirrored: true });
	});

	it("gives the first document back after two flips", () => {
		const scene = sceneOf({ display: "row" }, [40, 50]);
		const [child = scene.frame] = scene.children;
		scene.scope.doc.update(child, { rotation: 30, origin: { x: 0.2, y: 0.9 } });
		const before = scene.scope.doc.readSubtree(scene.frame);

		flip(scene, "x");
		flip(scene, "x");

		expect(scene.scope.doc.readSubtree(scene.frame)).toEqual(before);
	});
});

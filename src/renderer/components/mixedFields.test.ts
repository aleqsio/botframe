import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerFields } from "../../document/layer";
import { MIXED_TEXT, mixedText } from "./mixedValue";
import { sharedField, sharedGroups, writeAll, writeField } from "./mixedFields";
import { formatNumber } from "./numberValue";

const SQUARE: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const ROUND: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	...SQUARE,
	geometry: { kind: "ellipse" },
};

interface Scene {
	doc: DesignDocument;
	layers: readonly Layer[];
}

function sceneOf(...fields: readonly LayerFields[]): Scene {
	const doc = DesignDocument.create();
	const ids = fields.map((one) => doc.createLayer(one));
	doc.commit("create the layers");
	return { doc, layers: ids.flatMap((id) => doc.layer(id) ?? []) };
}

function turnedScene(one: number, other: number): Scene {
	const doc = DesignDocument.create();
	const ids = [one, other].map((rotation) => {
		const id = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 10, height: 10 });
		doc.update(id, { rotation });
		return id;
	});
	doc.commit("create the layers");
	return { doc, layers: ids.flatMap((id) => doc.layer(id) ?? []) };
}

function readOf(scene: Scene, label: string): string {
	return mixedText(sharedField(scene.layers, label), formatNumber);
}

function reread(scene: Scene): Scene {
	return {
		doc: scene.doc,
		layers: scene.layers.flatMap((layer) => scene.doc.layer(layer.id) ?? []),
	};
}

describe("sharedField", () => {
	it("gives the one value when each selected layer holds it", () => {
		expect(readOf(turnedScene(30, 30), "Rotation")).toBe("30");
	});

	it("gives the mixed word when the selected layers differ", () => {
		expect(readOf(turnedScene(30, 45), "Rotation")).toBe(MIXED_TEXT);
	});
});

describe("sharedGroups", () => {
	it("keeps a group that each selected layer holds", () => {
		const scene = sceneOf(
			{ ...SQUARE, x: 0, y: 0, width: 10, height: 10 },
			{ ...SQUARE, x: 0, y: 0, width: 10, height: 10 },
		);

		expect(sharedGroups(scene.layers).map((group) => group.name)).toEqual([
			"Rotation",
			"Origin",
			"Corners",
		]);
	});

	it("drops a group that one selected layer does not hold", () => {
		const scene = sceneOf(
			{ ...SQUARE, x: 0, y: 0, width: 10, height: 10 },
			{ ...ROUND, x: 0, y: 0, width: 10, height: 10 },
		);

		expect(sharedGroups(scene.layers).map((group) => group.name)).toEqual(["Rotation", "Origin"]);
	});
});

describe("writeField", () => {
	it("writes the typed value to each selected layer in one undo step", () => {
		const scene = turnedScene(30, 45);

		writeField(scene.doc, scene.layers, "Rotation", "90");

		expect(readOf(reread(scene), "Rotation")).toBe("90");
		scene.doc.undo();
		expect(readOf(reread(scene), "Rotation")).toBe(MIXED_TEXT);
	});

	it("leaves the document alone for text that no field accepts", () => {
		const scene = turnedScene(30, 45);
		const before = scene.doc.changeCount();

		writeField(scene.doc, scene.layers, "Rotation", "not a number");

		expect(scene.doc.changeCount()).toBe(before);
	});
});

describe("writeAll", () => {
	it("writes the patch to each selected layer in one undo step", () => {
		const scene = sceneOf(
			{ ...SQUARE, x: 0, y: 0, width: 10, height: 10, name: "one" },
			{ ...SQUARE, x: 0, y: 0, width: 10, height: 10, name: "other" },
		);

		writeAll(scene.doc, scene.layers, { name: "both" }, "rename layers");

		expect(reread(scene).layers.map((layer) => layer.name)).toEqual(["both", "both"]);
		scene.doc.undo();
		expect(reread(scene).layers.map((layer) => layer.name)).toEqual(["one", "other"]);
	});
});

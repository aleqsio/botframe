import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import { PLAIN_INSTANCE } from "../../document/layer";
import type { Layer, LayerId } from "../../document/layer";
import { DEFAULT_TEXT_STYLE } from "../../document/text";
import {
	glyphOf,
	inspectorHeading,
	isCode,
	isFrame,
	isRootFrame,
	layerEntry,
	nextLayerName,
} from "./layerEntry";

function rectangle(id: LayerId, fill: string): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 240,
		height: 160,
		...pixelBox({ x: 0, y: 0, width: 240, height: 160 }),
		rotation: 0,
		skewX: 0,
		skewY: 0,
		mirrored: false,
		fill,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
		name: "",
		clip: false,
		parent: null,
	};
}

function frame(id: LayerId): Layer {
	return {
		...rectangle(id, "#ffffff"),
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
		clip: true,
	};
}

describe("isRootFrame", () => {
	it("takes a frame that sits at the root of the document", () => {
		expect(isRootFrame(frame("1@1"))).toBe(true);
	});

	it("passes over a frame inside a parent", () => {
		expect(isRootFrame({ ...frame("1@1"), parent: "2@1" })).toBe(false);
	});

	it("passes over a shape at the root, and over no layer", () => {
		expect(isRootFrame(rectangle("1@1", "#000000"))).toBe(false);
		expect(isRootFrame({ ...rectangle("1@1", "#000000"), geometry: { kind: "ellipse" } })).toBe(
			false,
		);
		expect(isRootFrame(null)).toBe(false);
	});
});

describe("layerEntry", () => {
	it("gives a different entry for each of two stacked layers of one kind", () => {
		const top = layerEntry(rectangle("2@1", "#ff0000"));
		const bottom = layerEntry(rectangle("1@1", "#0000ff"));

		expect(top).not.toEqual(bottom);
		expect(top.swatch).toBe("#ff0000");
		expect(bottom.swatch).toBe("#0000ff");
	});

	it("names the kind of the layer", () => {
		const layer = rectangle("1@1", "#000000");

		expect(layerEntry(layer).label).toBe("Rectangle");
		expect(layerEntry({ ...layer, geometry: { kind: "ellipse" } }).label).toBe("Ellipse");
		expect(layerEntry({ ...layer, geometry: { kind: "path", vertices: [] } }).label).toBe("Path");
	});

	it("names a rectangle that holds the frame flag a frame", () => {
		expect(layerEntry(frame("1@1")).label).toBe("Frame");
	});

	it("tells a frame from a plain rectangle and from a layer that the document lost", () => {
		expect(isFrame(frame("1@1"))).toBe(true);
		expect(isFrame(rectangle("2@1", "#000000"))).toBe(false);
		expect(isFrame(null)).toBe(false);
	});

	it("takes the name of the layer over the name of the kind", () => {
		const layer = rectangle("1@1", "#000000");

		expect(layerEntry({ ...layer, name: "Header" }).label).toBe("Header");
		expect(layerEntry({ ...frame("2@1"), name: "Phone" }).label).toBe("Phone");
	});

	it("gives a plain entry for a layer that the document lost", () => {
		expect(layerEntry(null)).toEqual({ label: "Layer", swatch: "transparent" });
	});
});

describe("nextLayerName", () => {
	it("counts the layers of that kind and adds one", () => {
		const layers = [rectangle("1@1", "#000000"), frame("2@1"), rectangle("3@1", "#d9d9d9")];

		expect(nextLayerName("Rectangle", layers)).toBe("Rectangle 3");
		expect(nextLayerName("Frame", layers)).toBe("Frame 2");
	});

	it("counts a layer that a person renamed by its kind", () => {
		const layers = [{ ...rectangle("1@1", "#000000"), name: "Header" }];

		expect(nextLayerName("Rectangle", layers)).toBe("Rectangle 2");
	});

	it("starts at one in an empty document", () => {
		expect(nextLayerName("Frame", [])).toBe("Frame 1");
	});
});

describe("glyphOf", () => {
	it("draws a frame, an ellipse, and a rectangle with their own glyph", () => {
		const layer = rectangle("1@1", "#000000");

		expect(glyphOf(frame("2@1"), false)).toBe("frame");
		expect(glyphOf({ ...layer, geometry: { kind: "ellipse" } }, false)).toBe("ellipse");
		expect(glyphOf(layer, false)).toBe("rectangle");
	});

	it("draws a path, an unsupported layer, and a lost layer with the rectangle glyph", () => {
		const layer = rectangle("1@1", "#000000");

		expect(glyphOf({ ...layer, geometry: { kind: "path", vertices: [] } }, false)).toBe(
			"rectangle",
		);
		expect(glyphOf({ ...layer, geometry: { kind: "unsupported" } }, false)).toBe("rectangle");
		expect(glyphOf(null, false)).toBe("rectangle");
	});
});

describe("code components", () => {
	it("draws and names an instance of an HTML component as a code component", () => {
		const instance = {
			...frame("3@1"),
			content: {
				kind: "component" as const,
				component: "button",
				props: {},
				values: {},
				instance: PLAIN_INSTANCE,
			},
		};
		const html = { kind: "html" as const, source: "" };
		const view = {
			entry: (id: string) => ({ id, name: "Button", body: html }),
		};

		expect(isCode(instance, view)).toBe(true);
		expect(glyphOf(instance, true)).toBe("code");
		expect(inspectorHeading(instance, true)).toMatchObject({
			glyph: "code",
			kind: "Code component",
		});
		expect(inspectorHeading(instance, false)).toMatchObject({
			glyph: "component",
			kind: "Component",
		});
	});
});

describe("inspectorHeading", () => {
	it("heads the page when nothing is selected", () => {
		expect(inspectorHeading(null, false)).toEqual({
			glyph: "page",
			name: "Page",
			kind: "Nothing is selected",
		});
	});

	it("heads a layer with its name and its kind", () => {
		expect(inspectorHeading({ ...frame("1@1"), name: "Phone" }, false)).toEqual({
			glyph: "frame",
			name: "Phone",
			kind: "Frame",
		});
		expect(
			inspectorHeading({ ...rectangle("2@1", "#000000"), geometry: { kind: "ellipse" } }, false),
		).toEqual({
			glyph: "ellipse",
			name: "Ellipse",
			kind: "Ellipse",
		});
	});
});

describe("the entry of a text layer", () => {
	function text(content: string, name = ""): Layer {
		return {
			...rectangle("3@1", "#000000"),
			name,
			geometry: { kind: "text", content, ...DEFAULT_TEXT_STYLE },
		};
	}

	it("takes the first line of its text as the name until the user names it", () => {
		expect(layerEntry(text("  Hello\nworld")).label).toBe("Hello");
		expect(layerEntry(text("")).label).toBe("Text");
		expect(layerEntry(text("Hello", "Title")).label).toBe("Title");
	});

	it("shows the text glyph", () => {
		expect(glyphOf(text("Hello"), false)).toBe("text");
	});
});

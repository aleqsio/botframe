import { describe, expect, it } from "vitest";
import { imageBackground, paintedStyle, videoStyle } from "./mediaStyle";

const URL_TEXT = "blob:botframe/1";

describe("imageBackground", () => {
	it.each([
		["cover", `url("${URL_TEXT}") center / cover no-repeat, #ff0000`],
		["contain", `url("${URL_TEXT}") center / contain no-repeat, #ff0000`],
		["stretch", `url("${URL_TEXT}") 0 0 / 100% 100% no-repeat, #ff0000`],
		["tile", `url("${URL_TEXT}") 0 0 / auto repeat, #ff0000`],
	] as const)("puts the image with the %s fit above the fill color", (fit, text) => {
		expect(imageBackground("#ff0000", URL_TEXT, fit)).toBe(text);
	});
});

describe("paintedStyle", () => {
	it("adds an image to the background of the layer", () => {
		const style = paintedStyle({ background: "#ffffff" }, "cover", {
			kind: "image",
			url: URL_TEXT,
		});

		expect(style.background).toBe(`url("${URL_TEXT}") center / cover no-repeat, #ffffff`);
	});

	it("keeps the fill color for a video, which draws in its own element", () => {
		const style = paintedStyle({ background: "#ffffff" }, "cover", {
			kind: "video",
			url: URL_TEXT,
		});

		expect(style.background).toBe("#ffffff");
	});

	it("keeps the fill color while the asset is not in the document", () => {
		expect(paintedStyle({ background: "#ffffff" }, "cover", null).background).toBe("#ffffff");
	});
});

describe("videoStyle", () => {
	it("shows a tiled video once at its own size", () => {
		expect(videoStyle("tile")).toEqual({ objectFit: "none" });
	});
});

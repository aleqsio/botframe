import { describe, expect, it } from "vitest";
import { isAssetId } from "../document/assets";
import type { AssetId } from "../document/assets";
import type { MediaFill } from "../document/media";
import { imageBackground, paintedStyle, videoStyle } from "./mediaStyle";

const URL_TEXT = "blob:botframe/1";
function assetId(text: string): AssetId {
	if (!isAssetId(text)) {
		throw new Error("the text is not a content address");
	}
	return text;
}

const ASSET = assetId("a".repeat(64));
const COVER: MediaFill = { asset: ASSET, fit: "cover", stack: "over" };

describe("imageBackground", () => {
	it.each([
		["cover", `url("${URL_TEXT}") center / cover no-repeat, #ff0000`],
		["contain", `url("${URL_TEXT}") center / contain no-repeat, #ff0000`],
		["stretch", `url("${URL_TEXT}") 0 0 / 100% 100% no-repeat, #ff0000`],
		["tile", `url("${URL_TEXT}") 0 0 / auto repeat, #ff0000`],
	] as const)("puts the image with the %s fit above the fill color", (fit, text) => {
		expect(imageBackground("#ff0000", URL_TEXT, fit, "over")).toBe(text);
	});
});

describe("imageBackground under the paint", () => {
	it("draws a solid paint as an image layer over the image", () => {
		expect(imageBackground("#ff000080", URL_TEXT, "cover", "under")).toBe(
			`linear-gradient(#ff000080, #ff000080), url("${URL_TEXT}") center / cover no-repeat`,
		);
	});

	it("draws a gradient over the image", () => {
		const gradient = "linear-gradient(90deg, #000000 0%, #ffffff00 100%)";

		expect(imageBackground(gradient, URL_TEXT, "tile", "under")).toBe(
			`${gradient}, url("${URL_TEXT}") 0 0 / auto repeat`,
		);
	});
});

describe("imageBackground over a gradient", () => {
	it("keeps the gradient as the last layer under the image", () => {
		const gradient = "linear-gradient(90deg, #000000 0%, #ffffff 100%)";

		expect(imageBackground(gradient, URL_TEXT, "contain", "over")).toBe(
			`url("${URL_TEXT}") center / contain no-repeat, ${gradient}`,
		);
	});
});

describe("paintedStyle", () => {
	it("adds an image to the background of the layer", () => {
		const style = paintedStyle({ background: "#ffffff" }, COVER, {
			kind: "image",
			url: URL_TEXT,
		});

		expect(style.background).toBe(`url("${URL_TEXT}") center / cover no-repeat, #ffffff`);
	});

	it("keeps the fill color for a video, which draws in its own element", () => {
		const style = paintedStyle({ background: "#ffffff" }, COVER, {
			kind: "video",
			url: URL_TEXT,
		});

		expect(style.background).toBe("#ffffff");
	});

	it("keeps the fill color while the asset is not in the document", () => {
		expect(paintedStyle({ background: "#ffffff" }, COVER, null).background).toBe("#ffffff");
	});
});

describe("videoStyle", () => {
	it("shows a tiled video once at its own size", () => {
		expect(videoStyle("tile")).toEqual({ objectFit: "none" });
	});
});

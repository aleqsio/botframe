/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { isAssetId } from "../../document/assets";
import type { AssetId } from "../../document/assets";
import type { StoredFace } from "../../document/fonts";
import { faceSourcesOf, fontFaceCss } from "./fontFaceCss";
import interCss from "./inter/inter.css?raw";

const GOOGLE_CSS = `/* latin */
@font-face {
  font-family: 'Lobster';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/lobster/v30/a.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}`;
const ASSET = assetId("a".repeat(64));

function assetId(text: string): AssetId {
	if (!isAssetId(text)) {
		throw new Error("not a content address");
	}
	return text;
}

describe("faceSourcesOf", () => {
	it("reads each face of a Google Fonts stylesheet", () => {
		expect(faceSourcesOf(GOOGLE_CSS)).toEqual([
			{
				face: {
					family: "Lobster",
					italic: false,
					weight: [400, 400],
					unicodeRange: "U+0000-00FF, U+0131",
				},
				url: "https://fonts.gstatic.com/s/lobster/v30/a.woff2",
			},
		]);
	});

	it("reads the variable faces of the Inter files that the application ships", () => {
		const faces = faceSourcesOf(interCss);

		expect(faces).toHaveLength(14);
		expect(new Set(faces.map(({ face }) => face.family))).toEqual(new Set(["Inter"]));
		expect(new Set(faces.map(({ face }) => face.weight.join(" ")))).toEqual(new Set(["100 900"]));
		expect(faces.filter(({ face }) => face.italic)).toHaveLength(7);
	});
});

describe("fontFaceCss", () => {
	const face: StoredFace = {
		asset: ASSET,
		family: 'Bad "Name"\n}',
		italic: true,
		weight: [100, 900],
		unicodeRange: "U+0-FF",
	};

	it("writes one rule for each face that has a file, and keeps the name inside its quotes", () => {
		expect(fontFaceCss([face], () => "blob:one")).toBe(
			'@font-face { font-family: "Bad \\"Name\\" }"; font-style: italic; font-weight: 100 900; src: url("blob:one") format("woff2"); unicode-range: U+0-FF; }',
		);
		expect(fontFaceCss([face], () => null)).toBe("");
	});
});

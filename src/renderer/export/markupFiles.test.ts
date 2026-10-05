import { describe, expect, it } from "vitest";
import { assetOf } from "../../document/assets";
import { htmlFile, zipFile } from "./markupFiles";

const URL = "blob:file:///1234";
const ASSET = await assetOf(new Uint8Array([1, 2, 3]), "image/png");
const MARKUP = {
	html: `<div style="background: url(&quot;${URL}&quot;)"></div>`,
	css: `.layer { background: url("${URL}"); }`,
	width: 10,
	height: 10,
	assets: new Map(ASSET === null ? [] : [[URL, ASSET]]),
};

describe("markup files", () => {
	it("puts each asset in a single page as a data URL", () => {
		const page = new TextDecoder().decode(htmlFile(MARKUP, "Card"));
		expect(page).toContain("<title>Card</title>");
		expect(page).toContain("url(&quot;data:image/png;base64,AQID&quot;)");
		expect(page).toContain('url("data:image/png;base64,AQID")');
		expect(page).not.toContain("blob:");
	});

	it("puts each asset in a ZIP as a file in the assets folder", () => {
		const text = new TextDecoder().decode(zipFile(MARKUP, "Card"));
		expect(text).toContain("index.html");
		expect(text).toContain('<link rel="stylesheet" href="styles.css">');
		expect(text).toContain('url("assets/asset-1.png")');
		expect(text).not.toContain("blob:");
	});
});

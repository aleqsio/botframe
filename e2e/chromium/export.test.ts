import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openRenderer } from "./support";

const GRAB = { x: 460, y: 300 };
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_WIDTH_AT = 16;

async function exportAs(page: Page, format: string): Promise<Download> {
	const section = page.getByRole("region", { name: "Export" });
	await section
		.getByRole("group", { name: "Format" })
		.getByRole("button", { name: format })
		.click();
	const saved = page.waitForEvent("download");
	await section.getByRole("button", { name: "Export", exact: true }).click();
	return saved;
}

async function bytesOf(download: Download): Promise<Buffer> {
	const path = await download.path();
	return readFile(path);
}

test("the website exports the selected layer as a PNG and a PDF download", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
	const width = await layers
		.first()
		.evaluate((element) => (element instanceof HTMLElement ? element.offsetWidth : 0));

	const png = await exportAs(page, "PNG");
	expect(png.suggestedFilename()).toMatch(/\.png$/u);
	const picture = await bytesOf(png);
	expect([...picture.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
	expect(picture.readUInt32BE(PNG_WIDTH_AT)).toBe(width);

	const pdf = await exportAs(page, "PDF");
	expect(pdf.suggestedFilename()).toMatch(/\.pdf$/u);
	const document = (await bytesOf(pdf)).toString("latin1");
	expect(document.startsWith("%PDF-")).toBe(true);
	expect(document).toContain(`/Width ${width * 2}`);
});

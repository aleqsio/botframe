import { expect, test } from "@playwright/test";
import { openRenderer } from "./support";

const SPOT = { x: 360, y: 140 };

test("the text tool places a layer, edits it in place, and the Text section styles it", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	await page.keyboard.press("t");
	await page.mouse.click(origin.x + SPOT.x, origin.y + SPOT.y);
	await page.keyboard.type("Hello");
	await page.keyboard.press("Enter");
	await page.keyboard.type("world");
	await page.keyboard.press("Escape");

	const text = page.locator(".layer-text");
	await expect(text).toHaveText("Hello\nworld");
	await expect(text).not.toHaveAttribute("contenteditable");
	const box = text.locator("..");
	const outline = await page.locator(".selection").boundingBox();
	expect(outline).toEqual(await box.boundingBox());

	const section = page.locator("section.layout-section", { hasText: "Decoration" });
	await section.getByRole("button", { name: "Center", exact: true }).click();
	await section.getByRole("button", { name: "Underline" }).click();
	await expect(box).toHaveCSS("text-align", "center");
	await expect(box).toHaveCSS("text-decoration-line", "underline");

	await page.keyboard.press("Enter");
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Delete");
	await page.keyboard.press("Escape");
	await expect(text).toHaveCount(0);
});

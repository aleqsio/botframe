import { expect, test } from "@playwright/test";
import { openRenderer } from "./support";

const GRAB = { x: 460, y: 300 };

test("the gradient tab paints the layer, and a stop takes a color", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	const layer = layers.first();
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);

	await page.getByRole("button", { name: "Fill picker" }).click();
	await page.getByRole("button", { name: "Gradient", exact: true }).click();

	await expect(layer).toHaveCSS("background-image", /^linear-gradient\(/u);
	await expect(page.getByRole("button", { name: "Linear · 2 stops" })).toBeVisible();

	const stop = page.getByLabel("Stop 2 color", { exact: true });
	await stop.fill("#ff0000");
	await stop.press("Enter");
	await expect(layer).toHaveCSS("background-image", /rgb\(255, 0, 0\) 100%\)$/u);

	await page.getByRole("button", { name: "Radial", exact: true }).click();
	await expect(layer).toHaveCSS("background-image", /^radial-gradient\(/u);

	await page.getByRole("button", { name: "Solid", exact: true }).click();
	await expect(layer).toHaveCSS("background-image", "none");
});

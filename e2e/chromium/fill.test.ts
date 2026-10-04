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

test("a stop that the arrow keys move past an other stop keeps the focus", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
	await page.getByRole("button", { name: "Fill picker" }).click();
	await page.getByRole("button", { name: "Gradient", exact: true }).click();
	await page.getByRole("button", { name: "Add stop" }).click();

	await page.getByRole("button", { name: "Stop 1 at 0%" }).focus();
	await Array.from({ length: 6 }).reduce<Promise<void>>(
		(done) => done.then(() => page.keyboard.press("Shift+ArrowRight")),
		Promise.resolve(),
	);

	await expect(page.locator(".gradient-handle:focus")).toHaveAccessibleName("Stop 2 at 60%");
});

test("the picker closes when the selection goes to an other layer without a press outside", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
	await page.keyboard.press("ControlOrMeta+d");
	await page.getByRole("button", { name: "Fill picker" }).click();
	await expect(page.getByRole("group", { name: "Fill type" })).toBeVisible();

	await page.locator(".layer-row[aria-pressed='false']").dispatchEvent("click");

	await expect(page.getByRole("group", { name: "Fill type" })).toHaveCount(0);
});

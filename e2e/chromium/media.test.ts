import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openRenderer, rectOf } from "./support";

const GRAB = { x: 460, y: 300 };
const RED_PIXEL = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
	"base64",
);
const SCHEMES = ["light", "dark"] as const;

async function openMedia(page: Page): Promise<void> {
	await page.getByRole("button", { name: "Add fill" }).click();
	await expect(page.getByRole("group", { name: "Fill type" })).toBeVisible();
}

async function chooseRedPixel(page: Page): Promise<void> {
	await openMedia(page);
	await page.getByLabel("Media file").setInputFiles({
		name: "red.png",
		mimeType: "image/png",
		buffer: RED_PIXEL,
	});
}

test("a chosen image fills the layer, takes a fit, and goes away on remove", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	const layer = layers.first();
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);

	await chooseRedPixel(page);

	await expect(layer).toHaveCSS("background-image", /^url\("blob:/u);
	await expect(layer).toHaveCSS("background-size", /^cover,/u);
	await page.getByRole("button", { name: "Tile" }).click();
	await expect(layer).toHaveCSS("background-repeat", /^repeat,/u);
	await page.getByRole("button", { name: "Remove media" }).click();
	await expect(layer).toHaveCSS("background-image", "none");
	await page.keyboard.press("ControlOrMeta+z");
	await expect(layer).toHaveCSS("background-image", /^url\("blob:/u);
});

test("a chosen video plays in the layer, and the tile fit is off for it", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
	await openMedia(page);

	await page.getByLabel("Media file").setInputFiles({
		name: "clip.mp4",
		mimeType: "video/mp4",
		buffer: Buffer.from("not a real clip"),
	});

	const video = layers.first().locator("video");
	await expect(video).toHaveAttribute("src", /^blob:/u);
	await expect(video).toHaveCSS("object-fit", "cover");
	await expect(layers.first()).toHaveCSS("background-image", "none");
	await expect(page.getByRole("button", { name: "Tile" })).toHaveAttribute("aria-disabled", "true");
});

for (const scheme of SCHEMES) {
	test(`the media controls fit the panel in the ${scheme} scheme`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		const { origin } = await openRenderer(page);
		await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
		await chooseRedPixel(page);
		const inspector = page.getByRole("complementary", { name: "Inspector" });
		const panel = await rectOf(inspector);
		const choose = page.getByRole("button", { name: "Choose file" });
		const boxes = await Promise.all(
			[
				choose,
				inspector.locator(".fill-row", { has: page.getByRole("button", { name: "Remove media" }) }),
				page.getByRole("group", { name: "Media fit" }),
			].map((control) => rectOf(control)),
		);

		for (const box of boxes) {
			expect(box.height).toBe(26);
			expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
		}
		expect(
			await page
				.getByRole("group", { name: "Media fit" })
				.evaluate((group) =>
					Array.from(
						group.querySelectorAll("button"),
						(button) => button.scrollWidth <= button.clientWidth,
					),
				),
		).toEqual([true, true, true, true]);
		await page.locator(".fill-section").screenshot({ path: `test-results/fill-${scheme}.png` });
		await page.locator(".fill-popup").screenshot({ path: `test-results/media-${scheme}.png` });
	});
}

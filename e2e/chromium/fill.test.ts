import { expect, test } from "@playwright/test";
import { centerOf, openRenderer } from "./support";

const GRAB = { x: 460, y: 300 };
const RED_PIXEL = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
	"base64",
);

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

test("a drag of the media row under the paint row draws the paint over the media", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	const layer = layers.first();
	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);
	await page.getByRole("button", { name: "Add fill" }).click();
	await page.getByLabel("Media file").setInputFiles({
		name: "red.png",
		mimeType: "image/png",
		buffer: RED_PIXEL,
	});
	await page.keyboard.press("Escape");
	await expect(layer).toHaveCSS("background-image", /^url\("blob:/u);

	const media = await centerOf(page.locator('[data-row="media"] .fill-name'));
	const paint = await centerOf(page.locator('[data-row="paint"]'));
	await page.mouse.move(media.x, media.y);
	await page.mouse.down();
	await page.mouse.move(media.x, paint.y + 8, { steps: 6 });
	await page.mouse.up();

	await expect(layer).toHaveCSS("background-image", /^linear-gradient\(.*url\("blob:/u);
	await expect(page.locator("[data-row]").first()).toHaveAttribute("data-row", "paint");
});

test("the document section shows only when no layer is selected", async ({ page }) => {
	const { origin } = await openRenderer(page);
	const section = page.getByRole("region", { name: "Document" });
	await expect(section).toBeVisible();

	await page.mouse.click(origin.x + GRAB.x, origin.y + GRAB.y);

	await expect(section).toHaveCount(0);
});

test("a document color shows as one card and never as a variable row", async ({ page }) => {
	await openRenderer(page);
	const section = page.getByRole("region", { name: "Document" });
	await section.getByRole("button", { name: "Add variable" }).click();
	await expect(page.getByRole("menuitem", { name: "Color" })).toHaveCount(0);
	await page.keyboard.press("Escape");
	await section.getByRole("button", { name: "Add document fill" }).click();
	await page.getByRole("menuitem", { name: "Color" }).click();
	await page.keyboard.press("Escape");
	await section.getByRole("button", { name: "Add variable" }).click();
	await page.getByRole("menuitem", { name: "Text" }).click();
	await page.keyboard.press("Enter");

	await expect(section.locator(".fill-card")).toHaveCount(1);
	await expect(section.locator(".prop-row")).toHaveCount(1);
	await expect(page.getByRole("region", { name: "Fill styles" })).toHaveCount(0);
});

test("the color tab shows the preset swatches only in the swatch mode", async ({ page }) => {
	await openRenderer(page);
	const section = page.getByRole("region", { name: "Document" });
	await section.getByRole("button", { name: "Add document fill" }).click();
	await page.getByRole("menuitem", { name: "Color" }).click();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("group", { name: "Preset colors" })).toHaveCount(0);

	await page.getByRole("button", { name: "Swatches" }).click();
	await page.getByRole("button", { name: "#ff3b30" }).click();

	await expect(page.getByLabel("Hex", { exact: true })).toHaveValue("#ff3b30");
	await expect(page.getByRole("button", { name: "#ff3b30" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});

test("the web build disables the media URL and points to the desktop app", async ({ page }) => {
	await openRenderer(page);
	await page
		.getByRole("region", { name: "Document" })
		.getByRole("button", { name: "Add media" })
		.click();

	const url = page.getByRole("menuitem", { name: "URL" });
	await expect(url).toHaveAttribute("aria-disabled", "true");
	await expect(url).toHaveAttribute("title", "Use the desktop app to add media from a URL");
});

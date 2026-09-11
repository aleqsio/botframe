import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { launchApp } from "./support";
import type { Drag } from "./support";

const ELLIPSE_DRAG: Drag = { from: { x: 260, y: 460 }, to: { x: 380, y: 560 } };

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box");
	}
	return box;
}

test("the Layers button of the file pill takes the layer card away and brings it back", async () => {
	const { app, window } = await launchApp();
	const toggle = window.locator("#file-bar").getByRole("button", { name: "Layers" });
	const card = window.locator("#layers");

	await expect(window.locator("#file-bar .file-name")).toHaveText("Untitled");
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(card).toHaveCount(1);

	await toggle.click();

	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await expect(card).toHaveCount(0);

	await toggle.click();

	await expect(card).toHaveCount(1);
	await expect(card.locator(".layer-row")).toHaveText(["Rectangle"]);

	await app.close();
});

test("the artboard tool opens a bar of presets above the tool bar, and select opens none", async () => {
	const { app, window } = await launchApp();
	const tools = window.getByRole("toolbar", { name: "Tools" });
	const options = window.getByRole("toolbar", { name: "Artboard options" });

	await expect(tools).toBeVisible();
	await expect(window.getByRole("toolbar")).toHaveCount(1);

	await window.keyboard.press("a");
	await expect(options).toBeVisible();

	await expect
		.poll(async () => {
			const top = await boxOf(tools);
			const above = await boxOf(options);
			return {
				gap: Math.round(top.y - (above.y + above.height)),
				heights: Math.abs(top.height - above.height) <= 1,
			};
		})
		.toEqual({ gap: 8, heights: true });

	await window.keyboard.press("v");
	await expect(window.getByRole("toolbar")).toHaveCount(1);

	await app.close();
});

test("the swap button turns each preset, and a vertical wheel scrolls the presets sideways", async () => {
	const { app, window } = await launchApp();
	const options = window.getByRole("toolbar", { name: "Artboard options" });
	const swap = options.getByRole("button", { name: "Swap width and height" });
	const firstSize = options.locator(".preset-size").first();
	const row = options.locator(".preset-row");

	await expect(window.locator(".layer")).toHaveCount(1);
	await window.keyboard.press("a");
	await expect(firstSize).toHaveText("393 × 852");

	await swap.click();

	await expect(swap).toHaveAttribute("aria-pressed", "true");
	await expect(firstSize).toHaveText("852 × 393");

	const start = await row.evaluate((element) => element.scrollLeft);
	await row.hover();
	await window.mouse.wheel(0, 120);

	await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(start);

	await app.close();
});

test("the shape options switch the rectangle tool to the ellipse tool, which draws an ellipse", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");
	const shapes = window.getByRole("toolbar", { name: "Shape options" });
	const layers = window.locator(".layer");

	await expect(layers).toHaveCount(1);
	await window.keyboard.press("r");
	await expect(shapes.getByRole("button", { name: "Rectangle" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);

	await shapes.getByRole("button", { name: "Ellipse" }).click();

	await expect(stage).toHaveAttribute("data-tool", "ellipse");
	await expect(shapes.getByRole("button", { name: "Ellipse" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);

	await window.mouse.move(ELLIPSE_DRAG.from.x, ELLIPSE_DRAG.from.y);
	await window.mouse.down();
	await window.mouse.move(ELLIPSE_DRAG.to.x, ELLIPSE_DRAG.to.y, { steps: 8 });
	await window.mouse.up();

	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveCSS("border-radius", "50%");
	await expect(layers.nth(1)).toHaveCSS("width", "120px");
	await expect(stage).toHaveAttribute("data-tool", "select");

	await app.close();
});

test("the zoom pill steps the zoom of the canvas in and out", async () => {
	const { app, window } = await launchApp();
	const zoom = window.getByRole("group", { name: "Zoom" });
	const viewport = window.locator("#viewport");

	await expect(zoom.locator("output")).toHaveText("100%");

	await zoom.getByRole("button", { name: "Zoom in" }).click();

	await expect(zoom.locator("output")).toHaveText("200%");
	await expect(viewport).toHaveAttribute("style", /scale\(2\)/u);

	await zoom.getByRole("button", { name: "Zoom out" }).click();

	await expect(zoom.locator("output")).toHaveText("100%");
	await expect(viewport).toHaveAttribute("style", /scale\(1\)/u);

	await app.close();
});

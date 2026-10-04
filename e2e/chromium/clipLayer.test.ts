import { expect, test } from "@playwright/test";
import { drawWith } from "../support";
import type { Drag } from "../support";
import { clickAt, openRenderer } from "./support";

const PHOTO: Drag = { from: { x: 600, y: 300 }, to: { x: 800, y: 420 } };
const BLOB: Drag = { from: { x: 650, y: 320 }, to: { x: 750, y: 400 } };
const PHOTO_CORNER = { x: 610, y: 310 };
const SEED = { x: 540, y: 340 };

test("a layer clips to the outline of the layer above, and the source stops painting", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	await drawWith(page, origin, "r", PHOTO);
	await drawWith(page, origin, "o", BLOB);
	await clickAt(page, origin, PHOTO_CORNER);
	const clip = page.getByRole("region", { name: "Clip" });

	await clip.getByRole("button", { name: "Layer" }).click();
	await expect(layers.nth(1)).toHaveCSS("clip-path", /^shape\(from 25% 50%/u);
	await expect(layers.nth(2)).toHaveCSS("visibility", "hidden");
	await expect(clip.getByRole("combobox", { name: "Clip layer" })).toContainText("Ellipse");
	await expect(page.locator(".layer-meta")).toContainText("clips");

	await clip.getByRole("button", { name: "None" }).click();
	await expect(layers.nth(1)).toHaveCSS("clip-path", "none");
	await expect(layers.nth(2)).toHaveCSS("visibility", "visible");
});

test("the clip makes a choice variable with its three options", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await clickAt(page, origin, SEED);
	const clip = page.getByRole("region", { name: "Clip" });
	await clip
		.getByRole("button", { name: "Clip: use a variable or a condition", exact: true })
		.click();
	await page.getByRole("button", { name: "Make a document variable" }).click();

	await expect(page.getByPlaceholder("Search choice variables")).toBeVisible();
	await expect(clip.locator(".variable-chip")).toHaveText("clip");
	await expect(clip.locator(".bound-now")).toHaveText("None");
	await expect(clip.getByRole("combobox", { name: "Clip layer" })).toContainText("Pick a layer");
});

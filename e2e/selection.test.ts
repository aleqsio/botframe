import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { at, drawWith, openStage } from "./support";
import type { Drag, Point } from "./support";

const ARTBOARD: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const OVER_THE_SHAPE = { x: 540, y: 340 };
const OVER_THE_ARTBOARD = { x: 300, y: 60 };

async function clickAt(window: Page, point: Point, modifier: string | null): Promise<void> {
	if (modifier !== null) {
		await window.keyboard.down(modifier);
	}
	await window.mouse.move(point.x, point.y);
	await window.mouse.down();
	await window.mouse.up();
	if (modifier !== null) {
		await window.keyboard.up(modifier);
	}
}

test("a shift press on the canvas adds a layer to the selection and takes it out again", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await clickAt(window, at(origin, OVER_THE_SHAPE), "Shift");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
	await expect(window.locator(".selection")).toHaveCount(1);
	await expect(window.locator(".selection-peer")).toHaveCount(1);

	await clickAt(window, at(origin, OVER_THE_ARTBOARD), "Shift");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).not.toHaveAttribute("data-selected", "");
	await expect(window.locator(".selection-peer")).toHaveCount(0);

	await clickAt(window, at(origin, OVER_THE_ARTBOARD), null);
	await expect(layers.nth(0)).not.toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await app.close();
});

test("a shift click on a row of the layer panel adds the layer to the selection", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);

	await rows.nth(0).click({ modifiers: ["Shift"] });
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await rows.nth(1).click({ modifiers: ["Shift"] });
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "false");

	await rows.nth(1).click();
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "false");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");

	await app.close();
});

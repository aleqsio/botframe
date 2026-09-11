import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { at, boxOf, drawWith, openStage } from "./support";
import type { Drag, Point } from "./support";

const CENTER = { x: 540, y: 340 };
const EMPTY = { x: 120, y: 80 };
const SE_CORNER = { x: 660, y: 420 };
const PANEL_STEP = 50;
const LABEL_STEP = 3;
const ARTBOARD: Drag = { from: { x: 200, y: 420 }, to: { x: 460, y: 600 } };

test("the select tool outlines the layer under the pointer until the press selects it", async () => {
	const { app, layers, origin, window } = await openStage();
	const highlight = window.locator(".highlight");

	await window.mouse.move(at(origin, EMPTY).x, at(origin, EMPTY).y);
	await expect(highlight).toHaveCount(0);

	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await expect(highlight).toHaveCount(1);
	expect(await boxOf(highlight)).toEqual(await boxOf(layers));

	await window.mouse.move(origin.x - PANEL_STEP, at(origin, CENTER).y);
	await expect(highlight).toHaveCount(0);

	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await window.mouse.down();
	await window.mouse.up();

	await expect(layers).toHaveAttribute("data-selected", "");
	await expect(window.locator(".selection")).toHaveCount(1);
	await expect(highlight).toHaveCount(0);

	await window.mouse.move(at(origin, SE_CORNER).x, at(origin, SE_CORNER).y);
	await expect(highlight).toHaveCount(0);

	await app.close();
});

test("the name above an artboard outlines the artboard that the press selects", async () => {
	const { app, origin, window } = await openStage();
	const label = window.locator(".artboard-label");
	const highlight = window.locator(".highlight");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(label).toHaveCount(1);

	await window.keyboard.press("v");
	await window.mouse.move(at(origin, EMPTY).x, at(origin, EMPTY).y);
	await window.mouse.down();
	await window.mouse.up();
	await expect(highlight).toHaveCount(0);

	const name = await boxOf(label);
	await window.mouse.move(name.x + LABEL_STEP, name.y + LABEL_STEP);

	await expect(highlight).toHaveCount(1);
	expect(await boxOf(highlight)).toEqual(await boxOf(window.locator(".layer").nth(1)));

	await app.close();
});

async function hoverLayerWith(window: Page, origin: Point, key: string): Promise<void> {
	const highlight = window.locator(".highlight");

	await window.keyboard.press("v");
	await window.mouse.move(at(origin, EMPTY).x, at(origin, EMPTY).y);
	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await expect(highlight).toHaveCount(1);

	await window.keyboard.press(key);
	await expect(highlight).toHaveCount(0);

	await window.mouse.move(at(origin, EMPTY).x, at(origin, EMPTY).y);
	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await expect(highlight).toHaveCount(0);
}

test("a tool that draws or moves the canvas outlines no layer", async () => {
	const { app, origin, window } = await openStage();

	await hoverLayerWith(window, origin, "r");
	await hoverLayerWith(window, origin, "h");

	await app.close();
});

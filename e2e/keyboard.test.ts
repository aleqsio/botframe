import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { at, launchApp, openStage, stageOrigin } from "./support";
import type { Point } from "./support";

const CENTER = { x: 540, y: 340 };
const START = /translate3d\(420px, 260px, 0px\)/u;
const APPLE = process.platform === "darwin";
const UNDO = APPLE ? "Meta+z" : "Control+z";
const DUPLICATE = APPLE ? "Meta+d" : "Control+d";

test("the keyboard moves, turns and scales the selected layer by an exact step", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");

	await expect(layer).toBeVisible();
	await expect(layer).toHaveAttribute("style", START);
	const origin = await stageOrigin(window);

	await window.keyboard.press("ArrowRight");
	await expect(layer).toHaveAttribute("style", START);

	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await window.mouse.down();
	await window.mouse.up();
	await expect(layer).toHaveAttribute("data-selected", "");

	await window.keyboard.press("ArrowRight");
	await window.keyboard.press("ArrowUp");
	await expect(layer).toHaveAttribute("style", /translate3d\(421px, 259px, 0px\)/u);

	await window.keyboard.press("Shift+ArrowRight");
	await expect(layer).toHaveAttribute("style", /translate3d\(431px, 259px, 0px\)/u);

	await window.keyboard.press("]");
	await expect(layer).toHaveAttribute("style", /rotate\(1deg\)/u);

	await window.keyboard.press("Shift+]");
	await expect(layer).toHaveAttribute("style", /rotate\(16deg\)/u);

	await window.keyboard.press("=");
	await expect(layer).toHaveAttribute("style", /width: 252px/u);
	await expect(layer).toHaveAttribute("style", /height: 168px/u);

	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await window.mouse.down();
	await window.mouse.move(at(origin, CENTER).x + 30, at(origin, CENTER).y, { steps: 4 });
	const held = await layer.getAttribute("style");
	await window.keyboard.press("ArrowRight");
	expect(await layer.getAttribute("style")).toBe(held);
	await window.mouse.up();

	await window.keyboard.press("Shift+=");
	await expect(layer).toHaveAttribute("style", /width: 302.4px/u);
	await expect(layer).toHaveAttribute("style", /height: 201.6px/u);
	await expect(layer).toHaveAttribute("style", /translate3d\(429.8px, 238.2px, 0px\)/u);

	await app.close();
});

async function clickAt(window: Page, point: Point): Promise<void> {
	await window.mouse.move(point.x, point.y);
	await window.mouse.down();
	await window.mouse.up();
}

test("the Delete key and the Backspace key take the selected layer away", async () => {
	const { app, layers, origin, window } = await openStage();
	const center = at(origin, CENTER);

	await window.keyboard.press("Delete");
	await expect(layers).toHaveCount(1);

	await clickAt(window, center);
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");

	await window.keyboard.press("Delete");
	await expect(layers).toHaveCount(0);
	await expect(window.locator(".layer-row")).toHaveCount(0);

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(1);

	await clickAt(window, center);
	await window.keyboard.press("Backspace");
	await expect(layers).toHaveCount(0);

	await app.close();
});

test("the duplicate accelerator copies the selected layer beside it", async () => {
	const { app, layers, origin, window } = await openStage();

	await clickAt(window, at(origin, CENTER));
	await window.keyboard.press(DUPLICATE);

	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveAttribute("style", /translate3d\(440px, 280px, 0px\)/u);
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(0)).not.toHaveAttribute("data-selected", "");

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(1);

	await app.close();
});

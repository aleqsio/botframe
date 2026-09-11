import { expect, test } from "@playwright/test";
import { dragOn, launchApp } from "./support";

const LIGHT_STAGE = "rgb(242, 242, 242)";
const DARK_STAGE = "rgb(29, 28, 34)";
const WINDOW_ORIGIN = { x: 0, y: 0 };
const PAN_START = { x: 700, y: 400 };
const PAN = { x: 47, y: 13 };
const DOT_SPACING = 20;

test("the canvas fills the window with a dot grid and follows the color scheme", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");
	const grid = window.locator("#dot-grid");
	const panel = window.locator("#inspector");

	await expect(stage).toBeVisible();
	await expect(stage).toHaveCSS("border-radius", "0px");
	await expect(grid).toHaveCSS("background-image", /^radial-gradient\(/u);
	await expect(grid).toHaveCSS("background-size", "20px 20px");
	await expect(grid).toHaveCSS("pointer-events", "none");

	const fill = await stage.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return {
			stage: { x: box.x, y: box.y, width: box.width, height: box.height },
			window: { x: 0, y: 0, width: globalThis.innerWidth, height: globalThis.innerHeight },
		};
	});
	expect(fill.stage).toEqual(fill.window);

	await window.emulateMedia({ colorScheme: "light" });
	await expect(stage).toHaveCSS("background-color", LIGHT_STAGE);
	const lightPanel = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);

	await window.emulateMedia({ colorScheme: "dark" });
	await expect(stage).toHaveCSS("background-color", DARK_STAGE);
	await expect(panel).not.toHaveCSS("background-color", lightPanel);

	await app.close();
});

test("the dot grid moves with a pan and scales with a zoom of the canvas", async () => {
	const { app, window } = await launchApp();
	const grid = window.locator("#dot-grid");
	const viewport = window.locator("#viewport");

	await expect(window.locator(".layer")).toHaveCount(1);
	await expect(grid).toHaveCSS("background-position", "10px 10px");

	await window.keyboard.press("h");
	await dragOn(window, WINDOW_ORIGIN, {
		from: PAN_START,
		to: { x: PAN_START.x + PAN.x, y: PAN_START.y + PAN.y },
	});

	await expect(viewport).toHaveAttribute("style", /translate\(47px, 13px\)/u);
	await expect(grid).toHaveCSS("background-position", "17px 3px");

	await window.mouse.move(PAN_START.x, PAN_START.y);
	await window.keyboard.down("Control");
	await window.mouse.wheel(0, -100);
	await window.keyboard.up("Control");

	await expect(viewport).not.toHaveAttribute("style", /scale\(1\)/u);
	await expect
		.poll(async () => {
			const zoom = await viewport.evaluate(
				(element) => new DOMMatrix(getComputedStyle(element).transform).a,
			);
			const size = await grid.evaluate((element) =>
				Number(element.style.backgroundSize.split("px", 1)[0]),
			);
			return Math.abs(size - DOT_SPACING * zoom);
		})
		.toBeLessThan(0.01);

	await app.close();
});

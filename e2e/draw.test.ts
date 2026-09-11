import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { at, openStage } from "./support";

const PRESS = { x: 280, y: 40 };
const RELEASE = { x: 480, y: 180 };
const TAP = { x: 300, y: 220 };

type Point = { x: number; y: number };

async function dragOnStage(window: Page, origin: Point, press: Point, release: Point) {
	await window.mouse.move(at(origin, press).x, at(origin, press).y);
	await window.mouse.down();
	await window.mouse.move(at(origin, release).x, at(origin, release).y, { steps: 8 });
}

test("the artboard tool draws a white artboard that clips its content", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await window.keyboard.press("a");
	await expect(stage).toHaveAttribute("data-tool", "artboard");

	await dragOnStage(window, origin, PRESS, RELEASE);
	await window.mouse.up();

	const drawn = layers.nth(1);
	await expect(drawn).toHaveAttribute("style", /translate3d\(280px, 40px, 0px\)/u);
	await expect(drawn).toHaveCSS("width", "200px");
	await expect(drawn).toHaveCSS("height", "140px");
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 255, 255)");
	await expect(drawn).toHaveCSS("overflow", "hidden");
	await expect(drawn).toHaveAttribute("data-selected", "");
	await expect(stage).toHaveAttribute("data-tool", "select");

	await app.close();
});

test("the rectangle tool draws a grey rectangle that shows its content", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await window.keyboard.press("r");
	await dragOnStage(window, origin, PRESS, RELEASE);
	await window.mouse.up();

	const drawn = layers.nth(1);
	await expect(drawn).toHaveCSS("background-color", "rgb(217, 217, 217)");
	await expect(drawn).toHaveCSS("overflow", "visible");
	await expect(drawn).toHaveAttribute("data-selected", "");
	await expect(stage).toHaveAttribute("data-tool", "select");

	await app.close();
});

test("a tap with a draw tool places a box of the default size on the point", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await window.keyboard.press("r");
	await window.mouse.move(at(origin, TAP).x, at(origin, TAP).y);
	await window.mouse.down();
	await window.mouse.up();

	const drawn = layers.nth(1);
	await expect(drawn).toHaveAttribute("style", /translate3d\(300px, 220px, 0px\)/u);
	await expect(drawn).toHaveCSS("width", "100px");
	await expect(drawn).toHaveCSS("height", "100px");
	await expect(stage).toHaveAttribute("data-tool", "select");

	await app.close();
});

test("Escape during a draw deletes the layer in progress", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await window.keyboard.press("a");
	await dragOnStage(window, origin, PRESS, RELEASE);
	await expect(layers).toHaveCount(2);

	await window.keyboard.press("Escape");
	await expect(layers).toHaveCount(1);

	await window.mouse.move(at(origin, TAP).x, at(origin, TAP).y, { steps: 4 });
	await window.mouse.up();
	await expect(layers).toHaveCount(1);
	await expect(stage).toHaveAttribute("data-tool", "select");

	await app.close();
});

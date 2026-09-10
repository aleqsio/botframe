import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { at, openStage } from "./support";

interface Point {
	x: number;
	y: number;
}

interface Drag {
	from: Point;
	to: Point;
}

const ARTBOARD: Drag = { from: { x: 40, y: 40 }, to: { x: 240, y: 180 } };
const INSIDE: Drag = { from: { x: 80, y: 80 }, to: { x: 180, y: 140 } };
const OVER_THE_EDGE: Drag = { from: { x: 180, y: 120 }, to: { x: 300, y: 240 } };
const MOVE_ARTBOARD: Drag = { from: { x: 220, y: 60 }, to: { x: 270, y: 110 } };
const OUTSIDE_THE_CLIP = { x: 270, y: 210 };
const CLIPPED_DRAG: Drag = { from: OUTSIDE_THE_CLIP, to: { x: 300, y: 230 } };
const SELECTION_BLUE = "rgb(13, 153, 255)";
const OVER_THE_ARTBOARD = { x: 200, y: 150 };

async function dragOn(window: Page, origin: Point, drag: Drag): Promise<void> {
	await window.mouse.move(at(origin, drag.from).x, at(origin, drag.from).y);
	await window.mouse.down();
	await window.mouse.move(at(origin, drag.to).x, at(origin, drag.to).y, { steps: 8 });
	await window.mouse.up();
}

async function drawWith(window: Page, origin: Point, key: string, drag: Drag): Promise<void> {
	await window.keyboard.press(key);
	await dragOn(window, origin, drag);
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the layer has no box");
	}
	return { x: box.x, y: box.y };
}

test("a draw inside an artboard puts the new layer in the artboard", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);

	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	await expect(child).toHaveCount(1);
	await expect(child).toHaveAttribute("style", /translate3d\(40px, 40px, 0px\)/u);
	await expect(child).toHaveCSS("width", "100px");
	await expect(child).toHaveCSS("height", "60px");
	expect(await boxOf(child)).toEqual(at(origin, INSIDE.from));
	expect(await boxOf(window.locator(".selection"))).toEqual(at(origin, INSIDE.from));

	await expect(rows).toHaveText(["Rectangle", "Artboard 1", "Rectangle 2"]);
	expect((await boxOf(rows.nth(2))).x - (await boxOf(rows.nth(1))).x).toBe(14);

	await rows.nth(1).click();
	await expect(artboard).toHaveAttribute("data-selected", "");
	await expect(child).not.toHaveAttribute("data-selected", "");

	await app.close();
});

test("a child of an artboard moves with the artboard", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	const before = await boxOf(child);

	await dragOn(window, origin, MOVE_ARTBOARD);

	await expect(artboard).toHaveAttribute("style", /translate3d\(90px, 90px, 0px\)/u);
	await expect(child).toHaveAttribute("style", /translate3d\(40px, 40px, 0px\)/u);
	expect(await boxOf(child)).toEqual({ x: before.x + 50, y: before.y + 50 });

	await app.close();
});

test("an artboard clips the part of a child outside its box", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", OVER_THE_EDGE);
	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	await expect(artboard).toHaveCSS("overflow", "hidden");
	await expect(child).toHaveCSS("width", "120px");

	await window.mouse.click(at(origin, OUTSIDE_THE_CLIP).x, at(origin, OUTSIDE_THE_CLIP).y);
	await expect(child).toHaveAttribute("data-selected", "");

	const before = await boxOf(child);
	await dragOn(window, origin, CLIPPED_DRAG);

	expect(await boxOf(child)).toEqual({ x: before.x + 30, y: before.y + 20 });
	await expect(child).toHaveAttribute("data-selected", "");

	await window.mouse.click(at(origin, OVER_THE_ARTBOARD).x, at(origin, OVER_THE_ARTBOARD).y);
	await expect(child).toHaveAttribute("data-selected", "");

	await app.close();
});

test("the selection border draws outside the clip of the artboard", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", OVER_THE_EDGE);
	const child = layers.nth(1).locator("> .layer");
	const selection = window.locator(".selection");

	await expect(child).toHaveAttribute("data-selected", "");
	await expect(child).toHaveCSS("outline-style", "none");
	await expect(selection).toHaveCSS("outline-style", "solid");
	await expect(selection).toHaveCSS("outline-color", SELECTION_BLUE);

	await app.close();
});

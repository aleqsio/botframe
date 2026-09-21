import { expect, test } from "@playwright/test";
import { at, drawWith } from "../support";
import type { Drag } from "../support";
import { dragCenterBy, makeRow, openRenderer, turnLayer, typeChip } from "./support";

const GRAB = { x: 460, y: 300 };
const DELTA = { x: 80, y: -40 };
const ARTBOARD: Drag = { from: { x: 300, y: 60 }, to: { x: 600, y: 240 } };
const INSIDE: Drag = { from: { x: 340, y: 100 }, to: { x: 440, y: 160 } };
const CHILD_IN_ROW = { x: 350, y: 90 };
const FILL_CHILD_IN_ROW = { x: 450, y: 90 };
const OUT_OF_THE_ROW_BY = { x: 450, y: 510 };
const ROW_WIDTH = "300px";

test("a drag moves the layer by the mouse delta", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);

	await dragCenterBy(page, layers.first(), at(origin, GRAB), DELTA);
});

test("a drag of a turned layer moves it by the mouse delta", async ({ page }) => {
	const { layers, origin } = await openRenderer(page);
	await turnLayer(page, origin, GRAB);

	await dragCenterBy(page, layers.first(), at(origin, GRAB), DELTA);
});

test("a drag of a turned layer with a corner origin moves it by the mouse delta", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	await turnLayer(page, origin, GRAB);
	await typeChip(page, "Origin X", "0");
	await typeChip(page, "Origin Y", "0");
	await expect(layers.first()).toHaveCSS("transform-origin", "0px 0px");

	await dragCenterBy(page, layers.first(), at(origin, GRAB), DELTA);
});

test("a child dragged out of a row lands at the root with its center moved by the mouse delta", async ({
	page,
}) => {
	const scene = await openRenderer(page);
	const { origin } = scene;
	await drawWith(page, origin, "a", ARTBOARD);
	await drawWith(page, origin, "r", INSIDE);
	const child = await makeRow(page, origin, scene);

	await dragCenterBy(page, child, at(origin, CHILD_IN_ROW), OUT_OF_THE_ROW_BY);

	await expect(page.locator("#viewport > .layer")).toHaveCount(3);
	await expect(child).toHaveCSS("position", "absolute");
});

test("a fill child keeps its painted width when it leaves the row", async ({ page }) => {
	const scene = await openRenderer(page);
	const { origin } = scene;
	await drawWith(page, origin, "a", ARTBOARD);
	await drawWith(page, origin, "r", INSIDE);
	const child = await makeRow(page, origin, scene);
	await page.mouse.click(at(origin, CHILD_IN_ROW).x, at(origin, CHILD_IN_ROW).y);
	await page.getByRole("group", { name: "W size" }).getByRole("button", { name: "Fill" }).click();
	await expect(child).toHaveCSS("width", ROW_WIDTH);

	await dragCenterBy(page, child, at(origin, FILL_CHILD_IN_ROW), OUT_OF_THE_ROW_BY);

	await expect(child).toHaveCSS("position", "absolute");
	await expect(child).toHaveCSS("width", ROW_WIDTH);
});

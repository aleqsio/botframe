import { expect, test } from "@playwright/test";
import { at, dragOn, drawWith } from "../support";
import type { Drag } from "../support";
import { clickAt, openRenderer } from "./support";

const ELLIPSE: Drag = { from: { x: 700, y: 80 }, to: { x: 900, y: 180 } };
const CENTER = { x: 800, y: 130 };
const BOX_CORNER = { x: 705, y: 35 };
const EMPTY = { x: 500, y: 600 };
const PULL: Drag = { from: { x: 800, y: 80 }, to: { x: 800, y: 30 } };

test("a double click on a shape shows its vertices, and a vertex drag bends the shape", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	await drawWith(page, origin, "o", ELLIPSE);
	await page.mouse.dblclick(at(origin, CENTER).x, at(origin, CENTER).y);
	await expect(page.locator(".path-vertex")).toHaveCount(4);
	await expect(page.locator(".selection-handle")).toHaveCount(0);

	await dragOn(page, origin, PULL);
	await expect(layers.last()).toHaveCSS("height", "150px");
	await expect(layers.last().locator(".layer-paint")).toHaveCSS(
		"clip-path",
		/^shape\(from 0% 66\.6667%, curve to 50% 0%/u,
	);

	await page.keyboard.press("Escape");
	await expect(page.locator(".path-edit")).toHaveCount(0);
	await expect(page.locator(".selection-handle")).toHaveCount(4);

	await clickAt(page, origin, EMPTY);
	await clickAt(page, origin, BOX_CORNER);
	await expect(page.locator(".selection-handle")).toHaveCount(0);
	await clickAt(page, origin, CENTER);
	await expect(page.locator(".selection-handle")).toHaveCount(4);
});

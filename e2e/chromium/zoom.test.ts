import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { at, drawWith } from "../support";
import type { Drag, Point } from "../support";
import { EMPTY, centerOf, clickAt, drawRowOfThree, openRenderer, rectOf } from "./support";

const STEPS_TO_32 = 5;
const DIGITS = 2;
const HANDLE_PIXELS = 8;
const FRAME: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const WHEEL_IN = -100;
const SHAPE: Drag = { from: { x: 300, y: 200 }, to: { x: 420, y: 280 } };

async function clickCenterOf(page: Page, layer: Locator): Promise<void> {
	const center = await centerOf(layer);
	await page.mouse.click(center.x, center.y);
}

async function fillWidth(page: Page, origin: Point, layer: Locator): Promise<void> {
	await clickAt(page, origin, EMPTY);
	await clickCenterOf(page, layer);
	await page.getByRole("group", { name: "W size" }).getByRole("button", { name: "Fill" }).click();
}

async function wheelInAt(page: Page, point: Point, deltaY: number): Promise<void> {
	await page.mouse.move(point.x, point.y);
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, deltaY);
	await page.keyboard.up("Control");
}

async function clickTimes(locator: Locator, times: number): Promise<void> {
	if (times === 0) {
		return;
	}
	await locator.click();
	await clickTimes(locator, times - 1);
}

test("the selection outline sits on a fill child of a row at zoom 32", async ({ page }) => {
	const { origin } = await openRenderer(page);
	const children = await drawRowOfThree(page, origin);
	await fillWidth(page, origin, children.nth(0));
	await fillWidth(page, origin, children.nth(1));
	await fillWidth(page, origin, children.nth(2));
	const middle = children.nth(1);
	await expect(middle).toHaveCSS("width", /^106\.6/u);
	await clickAt(page, origin, EMPTY);
	await clickCenterOf(page, middle);
	const zoom = page.getByRole("group", { name: "Zoom" });

	await clickTimes(zoom.getByRole("button", { name: "Zoom in" }), STEPS_TO_32);

	await expect(zoom.locator("output")).toHaveText("3200%");
	const layer = await rectOf(middle);
	const outline = await rectOf(page.locator(".selection"));
	expect(outline.x).toBeCloseTo(layer.x, DIGITS);
	expect(outline.width).toBeCloseTo(layer.width, DIGITS);
});

test("the handles and the origin mark keep their screen size at zoom 32", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", SHAPE);
	const zoom = page.getByRole("group", { name: "Zoom" });

	await clickTimes(zoom.getByRole("button", { name: "Zoom in" }), STEPS_TO_32);

	await expect(zoom.locator("output")).toHaveText("3200%");
	const handle = await rectOf(page.locator(".selection-handle").first());
	const mark = await rectOf(page.locator(".origin-mark"));
	expect(handle.width).toBeCloseTo(HANDLE_PIXELS, DIGITS);
	expect(mark.width).toBeCloseTo(HANDLE_PIXELS, DIGITS);
	await expect(page.locator(".selection")).toHaveCSS("outline-width", "2px");
});

test("a guide stays one pixel wide at a zoom between the steps", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "a", FRAME);
	await page.locator(".guide-add", { hasText: "Vertical" }).click();
	const line = page.locator(".guide-line");
	const frame = page.locator(".layer", { has: line });
	const zoom = page.getByRole("group", { name: "Zoom" });
	await clickTimes(zoom.getByRole("button", { name: "Zoom in" }), STEPS_TO_32);
	await expect(zoom.locator("output")).toHaveText("3200%");

	await wheelInAt(page, at(origin, EMPTY), WHEEL_IN);

	await expect(zoom.locator("output")).not.toHaveText("3200%");
	const guide = await rectOf(line);
	const box = await rectOf(frame);
	expect(guide.width).toBeCloseTo(1, DIGITS);
	expect(guide.x - box.x).toBeCloseTo(box.width / 2, 0);
});

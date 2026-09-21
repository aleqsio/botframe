import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import type { Point } from "../support";
import { EMPTY, centerOf, clickAt, drawRowOfThree, openRenderer, rectOf } from "./support";

const STEPS_TO_32 = 5;
const DIGITS = 2;

async function clickCenterOf(page: Page, layer: Locator): Promise<void> {
	const center = await centerOf(layer);
	await page.mouse.click(center.x, center.y);
}

async function fillWidth(page: Page, origin: Point, layer: Locator): Promise<void> {
	await clickAt(page, origin, EMPTY);
	await clickCenterOf(page, layer);
	await page.getByRole("group", { name: "W size" }).getByRole("button", { name: "Fill" }).click();
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

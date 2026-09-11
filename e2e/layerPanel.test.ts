import { expect, test } from "@playwright/test";
import { drawWith, openStage } from "./support";
import type { Drag } from "./support";

const ARTBOARD: Drag = { from: { x: 40, y: 40 }, to: { x: 240, y: 180 } };
const INSIDE: Drag = { from: { x: 80, y: 80 }, to: { x: 180, y: 140 } };
const BRANCH = ["Rectangle", "Artboard 1", "Rectangle 2"];

test("the chevron takes the children of a row away and brings them back", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	await expect(rows).toHaveText(BRANCH);

	const chevron = window.locator("button.layer-chevron");
	await expect(chevron).toHaveCount(1);
	await expect(chevron).toHaveAttribute("aria-expanded", "true");

	await chevron.click();

	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);
	await expect(chevron).toHaveAttribute("aria-expanded", "false");
	await expect(chevron).toHaveAttribute("aria-label", "Expand Artboard 1");

	await chevron.click();

	await expect(rows).toHaveText(BRANCH);
	await app.close();
});

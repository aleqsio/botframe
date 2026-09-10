import { expect, test } from "@playwright/test";
import { at, launchApp, stageOrigin } from "./support";

const CENTER = { x: 540, y: 340 };
const SE_CORNER = { x: 660, y: 420 };
const GROWN_SE = { x: 700, y: 460 };

test("the rectangle tool takes the resize handles of the selected layer", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");
	const layer = window.locator(".layer");
	const handles = window.locator(".selection-handle");
	const bar = window.locator(".floating-bar");

	await expect(layer).toHaveCount(1);
	const origin = await stageOrigin(window);

	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await window.mouse.down();
	await window.mouse.up();
	await expect(handles).toHaveCount(4);

	await bar.getByLabel("Rectangle").click();
	await expect(stage).toHaveAttribute("data-tool", "rectangle");
	await expect(handles).toHaveCount(4);

	await window.mouse.move(at(origin, SE_CORNER).x, at(origin, SE_CORNER).y);
	await expect(stage).toHaveAttribute("data-zone", "resize-se");
	await expect(stage).toHaveCSS("cursor", "nwse-resize");

	await window.mouse.down();
	await window.mouse.move(at(origin, GROWN_SE).x, at(origin, GROWN_SE).y, { steps: 6 });
	await window.mouse.up();

	await expect(layer).toHaveAttribute("style", /translate3d\(420px, 260px, 0px\).*width: 280px/su);
	await expect(layer).toHaveAttribute("style", /height: 200px/u);
	await expect(layer).toHaveCount(1);

	await app.close();
});

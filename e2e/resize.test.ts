import { expect, test } from "@playwright/test";
import { at, launchApp, stageOrigin } from "./support";

const CENTER = { x: 540, y: 340 };
const SE_CORNER = { x: 660, y: 420 };
const GROWN_SE = { x: 700, y: 460 };
const WEST_SIDE = { x: 420, y: 360 };
const WIDE_WEST = { x: 350, y: 360 };
const WIDE_SE = { x: 700, y: 485 };
const CENTERED_SE = { x: 730, y: 485 };
const TURN_FROM = { x: 302, y: 217 };
const TURN_TO = { x: 748, y: 503 };

test("the selected layer takes a resize from each handle and a turn from the corner reach", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");
	const layer = window.locator(".layer");
	const handles = window.locator(".selection-handle");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);
	const dragTo = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
		await window.mouse.move(at(origin, from).x, at(origin, from).y);
		await window.mouse.down();
		await window.mouse.move(at(origin, to).x, at(origin, to).y, { steps: 6 });
		await window.mouse.up();
	};

	await expect(handles).toHaveCount(0);
	await window.mouse.move(at(origin, CENTER).x, at(origin, CENTER).y);
	await window.mouse.down();
	await window.mouse.up();
	await expect(handles).toHaveCount(4);

	await window.mouse.move(at(origin, SE_CORNER).x, at(origin, SE_CORNER).y);
	await expect(stage).toHaveAttribute("data-zone", "resize-se");
	await expect(stage).toHaveCSS("cursor", "nwse-resize");

	await dragTo(SE_CORNER, GROWN_SE);
	await expect(layer).toHaveAttribute("style", /translate3d\(420px, 260px, 0px\).*width: 280px/su);
	await expect(layer).toHaveAttribute("style", /height: 200px/u);

	await window.mouse.move(at(origin, WEST_SIDE).x, at(origin, WEST_SIDE).y);
	await expect(stage).toHaveAttribute("data-zone", "resize-w");
	await expect(stage).toHaveCSS("cursor", "ew-resize");

	await window.keyboard.down("Shift");
	await dragTo(WEST_SIDE, WIDE_WEST);
	await window.keyboard.up("Shift");
	await expect(layer).toHaveAttribute("style", /translate3d\(350px, 235px, 0px\).*width: 350px/su);
	await expect(layer).toHaveAttribute("style", /height: 250px/u);

	await window.keyboard.down("Alt");
	await dragTo(WIDE_SE, CENTERED_SE);
	await window.keyboard.up("Alt");
	await expect(layer).toHaveAttribute("style", /translate3d\(320px, 235px, 0px\).*width: 410px/su);
	await expect(layer).toHaveAttribute("style", /height: 250px/u);

	await window.mouse.move(at(origin, TURN_FROM).x, at(origin, TURN_FROM).y);
	await expect(stage).toHaveAttribute("data-zone", "rotate-nw");

	await dragTo(TURN_FROM, TURN_TO);
	await expect(layer).toHaveAttribute(
		"style",
		/translate3d\(320px, 235px, 0px\) translate\(205px, 125px\) rotate\(180deg\)/u,
	);

	await app.close();
});

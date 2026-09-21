import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { at, clickAt, dragOn, drawWith, openStage } from "./support";
import type { Drag, Point } from "./support";

const ARTBOARD: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const OVER_THE_SHAPE = { x: 540, y: 340 };
const OVER_THE_ARTBOARD = { x: 300, y: 60 };

test("a shift press on the canvas adds a layer to the selection and takes it out again", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await clickAt(window, at(origin, OVER_THE_SHAPE), "Shift");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
	await expect(window.locator(".selection")).toHaveCount(1);
	await expect(window.locator(".selection-peer")).toHaveCount(2);

	await clickAt(window, at(origin, OVER_THE_ARTBOARD), "Shift");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).not.toHaveAttribute("data-selected", "");
	await expect(window.locator(".selection-peer")).toHaveCount(0);

	await clickAt(window, at(origin, OVER_THE_ARTBOARD));
	await expect(layers.nth(0)).not.toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await app.close();
});

test("a shift click on a row of the layer panel adds the layer to the selection", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);

	await rows.nth(0).click({ modifiers: ["Shift"] });
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await rows.nth(1).click({ modifiers: ["Shift"] });
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "false");

	await rows.nth(1).click();
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "false");
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");

	await app.close();
});

const GROUP_ORIGIN = { x: 280, y: 40 };
const GROUP_SIZE = 380;
const GROUP_SE = { x: 660, y: 420 };
const GROWN_SE = { x: 850, y: 610 };
const CARRY = { x: 50, y: 30 };

async function selectBoth(window: Page, origin: Point): Promise<void> {
	await drawWith(window, origin, "a", ARTBOARD);
	await clickAt(window, at(origin, OVER_THE_SHAPE), "Shift");
}

test("the selection of two layers takes one frame with handles around both", async () => {
	const { app, origin, window } = await openStage();
	const frame = window.locator(".selection");

	await selectBoth(window, origin);

	await expect(frame).toHaveCount(1);
	await expect(window.locator(".selection-handle")).toHaveCount(4);
	await expect(window.locator(".selection-peer")).toHaveCount(2);
	const box = await frame.boundingBox();
	expect(box).toMatchObject({ ...at(origin, GROUP_ORIGIN), width: GROUP_SIZE, height: GROUP_SIZE });
	await expect(window.locator("#inspector .inspector-name")).toHaveText("2 layers");
	await expect(window.locator("#inspector .inspector-kind")).toHaveText("Selection");

	await app.close();
});

test("a drag on one selected layer carries every selected layer", async () => {
	const { app, layers, origin, window } = await openStage();

	await selectBoth(window, origin);
	await dragOn(window, origin, {
		from: OVER_THE_SHAPE,
		to: { x: OVER_THE_SHAPE.x + CARRY.x, y: OVER_THE_SHAPE.y + CARRY.y },
	});

	await expect(layers.nth(0)).toHaveAttribute("style", /translate3d\(470px, 290px, 0px\)/u);
	await expect(layers.nth(1)).toHaveAttribute("style", /translate3d\(330px, 70px, 0px\)/u);
	await expect(layers.nth(0)).toHaveAttribute("data-selected", "");
	await expect(layers.nth(1)).toHaveAttribute("data-selected", "");

	await app.close();
});

test("a corner handle of the selection scales every selected layer as one block", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await selectBoth(window, origin);
	await window.mouse.move(at(origin, GROUP_SE).x, at(origin, GROUP_SE).y);
	await expect(stage).toHaveAttribute("data-zone", "resize-se");
	await dragOn(window, origin, { from: GROUP_SE, to: GROWN_SE });

	await expect(layers.nth(0)).toHaveAttribute(
		"style",
		/translate3d\(490px, 370px, 0px\).*width: 360px; height: 240px/su,
	);
	await expect(layers.nth(1)).toHaveAttribute(
		"style",
		/translate3d\(280px, 40px, 0px\).*width: 300px; height: 210px/su,
	);

	await app.close();
});

test("a fill typed in the inspector paints every selected layer", async () => {
	const { app, layers, origin, window } = await openStage();

	await selectBoth(window, origin);
	const fill = window.getByLabel("Fill", { exact: true });
	await fill.fill("#ff0000");
	await fill.press("Enter");

	await expect(layers.nth(0)).toHaveCSS("background-color", "rgb(255, 0, 0)");
	await expect(layers.nth(1)).toHaveCSS("background-color", "rgb(255, 0, 0)");

	await app.close();
});

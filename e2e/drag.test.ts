import { _electron as electron, expect, test } from "@playwright/test";
import { dragOn, drawWith, openStage } from "./support";

const START = { x: 420, y: 260 };
const DELTA = { x: 100, y: 70 };
const GRAB = { x: 40, y: 40 };
const COVER = { from: { x: 700, y: 240 }, to: { x: 500, y: 400 } };
const OVERLAP = { from: { x: 560, y: 320 }, to: { x: 620, y: 360 } };

test("dragging the rectangle writes the new position into the document", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const layer = window.locator(".layer");

	await expect(layer).toBeVisible();
	await expect(layer).toHaveAttribute(
		"style",
		new RegExp(`translate3d\\(${START.x}px, ${START.y}px, 0px\\)`, "u"),
	);
	const box = await layer.boundingBox();
	expect(box).toMatchObject({ width: 240, height: 160 });
	if (box === null) {
		throw new Error("the layer has no box");
	}

	await window.mouse.move(box.x + GRAB.x, box.y + GRAB.y);
	await window.mouse.down({ button: "right" });
	await window.mouse.move(box.x + GRAB.x + DELTA.x, box.y + GRAB.y + DELTA.y, { steps: 4 });
	await window.mouse.up({ button: "right" });

	expect(await layer.boundingBox()).toMatchObject({ x: box.x, y: box.y });
	await expect(layer).toHaveAttribute("data-selected", "");

	const menu = window.locator(".layer-menu");
	await expect(menu).toBeVisible();
	await window.keyboard.press("Escape");
	await expect(menu).toBeHidden();

	await window.mouse.move(box.x + GRAB.x, box.y + GRAB.y);
	await window.mouse.down();
	await window.mouse.move(box.x + GRAB.x + DELTA.x, box.y + GRAB.y + DELTA.y, { steps: 12 });
	await window.mouse.up();

	await expect(layer).toHaveAttribute("style", /translate3d\(520px, 330px, 0px\)/u, {
		timeout: 2000,
	});
	expect(await layer.boundingBox()).toMatchObject({ x: box.x + DELTA.x, y: box.y + DELTA.y });
	await expect(layer).toHaveAttribute("data-selected", "");

	await app.close();
});

test("the drag moves the selected layer that another layer covers", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "r", COVER);
	await expect(rows).toHaveText(["Rectangle", "Rectangle 2"]);
	await expect(layers.nth(1)).toHaveAttribute("style", /translate3d\(500px, 240px, 0px\)/u);

	await rows.nth(0).click();
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");

	await dragOn(window, origin, OVERLAP);

	await expect(layers.nth(0)).toHaveAttribute("style", /translate3d\(480px, 300px, 0px\)/u);
	await expect(layers.nth(1)).toHaveAttribute("style", /translate3d\(500px, 240px, 0px\)/u);
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");

	await app.close();
});

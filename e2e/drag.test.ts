import { _electron as electron, expect, test } from "@playwright/test";

const START = { x: 420, y: 260 };
const DELTA = { x: 100, y: 70 };
const GRAB = { x: 40, y: 40 };

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
	await window.mouse.down();
	await window.mouse.move(box.x + GRAB.x + DELTA.x, box.y + GRAB.y + DELTA.y, { steps: 12 });
	await window.mouse.up();

	await expect(layer).toHaveAttribute("style", /translate3d\(520px, 330px, 0px\)/u, {
		timeout: 2000,
	});
	expect(await layer.boundingBox()).toMatchObject({ x: box.x + DELTA.x, y: box.y + DELTA.y });

	await app.close();
});

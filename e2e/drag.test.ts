import { _electron as electron, expect, test } from "@playwright/test";

const START = { x: 420, y: 260 };
const DELTA = { x: 100, y: 70 };

test("dragging the rectangle writes the new position into the document", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const layer = window.locator(".layer");

	await expect(layer).toBeVisible();
	expect(await layer.boundingBox()).toMatchObject({ ...START, width: 240, height: 160 });

	await window.mouse.move(START.x + 40, START.y + 40);
	await window.mouse.down();
	await window.mouse.move(START.x + 40 + DELTA.x, START.y + 40 + DELTA.y, { steps: 12 });
	await window.mouse.up();

	await expect(layer).toHaveAttribute("style", /translate3d\(520px, 330px, 0px\)/u, {
		timeout: 2000,
	});
	expect(await layer.boundingBox()).toMatchObject({ x: START.x + DELTA.x, y: START.y + DELTA.y });

	await app.close();
});

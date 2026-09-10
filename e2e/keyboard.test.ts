import { _electron as electron, expect, test } from "@playwright/test";

const CENTER = { x: 540, y: 340 };
const START = /translate3d\(420px, 260px, 0px\)/u;

test("the keyboard moves, turns and scales the selected layer by an exact step", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const layer = window.locator(".layer");

	await expect(layer).toBeVisible();
	await expect(layer).toHaveAttribute("style", START);
	const origin = await window.locator("#stage").evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.left, y: box.top };
	});

	await window.keyboard.press("ArrowRight");
	await expect(layer).toHaveAttribute("style", START);

	await window.mouse.move(origin.x + CENTER.x, origin.y + CENTER.y);
	await window.mouse.down();
	await window.mouse.up();
	await expect(layer).toHaveAttribute("data-selected", "");

	await window.keyboard.press("ArrowRight");
	await window.keyboard.press("ArrowUp");
	await expect(layer).toHaveAttribute("style", /translate3d\(421px, 259px, 0px\)/u);

	await window.keyboard.press("Shift+ArrowRight");
	await expect(layer).toHaveAttribute("style", /translate3d\(431px, 259px, 0px\)/u);

	await window.keyboard.press("]");
	await expect(layer).toHaveAttribute("style", /rotate\(1deg\)/u);

	await window.keyboard.press("Shift+]");
	await expect(layer).toHaveAttribute("style", /rotate\(16deg\)/u);

	await window.keyboard.press("=");
	await expect(layer).toHaveAttribute("style", /width: 252px/u);
	await expect(layer).toHaveAttribute("style", /height: 168px/u);

	await window.keyboard.press("Shift+=");
	await expect(layer).toHaveAttribute("style", /width: 302.4px/u);
	await expect(layer).toHaveAttribute("style", /height: 201.6px/u);
	await expect(layer).toHaveAttribute("style", /translate3d\(399.8px, 238.2px, 0px\)/u);

	await app.close();
});

import { expect, test } from "@playwright/test";
import { launchApp } from "./support";

const LIGHT_STAGE = "rgb(242, 242, 242)";
const DARK_STAGE = "rgb(29, 28, 34)";

test("the canvas fills the window with a dot grid and follows the color scheme", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");
	const panel = window.locator("#properties");

	await expect(stage).toBeVisible();
	await expect(stage).toHaveCSS("border-radius", "0px");
	await expect(stage).toHaveCSS("background-image", /^radial-gradient\(/u);
	await expect(stage).toHaveCSS("background-size", "20px 20px");

	const fill = await stage.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return {
			stage: { x: box.x, y: box.y, width: box.width, height: box.height },
			window: { x: 0, y: 0, width: globalThis.innerWidth, height: globalThis.innerHeight },
		};
	});
	expect(fill.stage).toEqual(fill.window);

	await window.emulateMedia({ colorScheme: "light" });
	await expect(stage).toHaveCSS("background-color", LIGHT_STAGE);
	const lightPanel = await panel.evaluate((element) => getComputedStyle(element).backgroundColor);

	await window.emulateMedia({ colorScheme: "dark" });
	await expect(stage).toHaveCSS("background-color", DARK_STAGE);
	await expect(panel).not.toHaveCSS("background-color", lightPanel);

	await app.close();
});

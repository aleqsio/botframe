import { expect, test } from "@playwright/test";
import { launchApp } from "./support";

const CENTER = { x: 540, y: 340 };

test("the select tool shows the pointer over a layer and grabbing only while it moves", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");

	await expect(layer).toBeVisible();
	const origin = await window.locator("#stage").evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.left, y: box.top };
	});

	await window.mouse.move(origin.x + CENTER.x, origin.y + CENTER.y);
	await expect(layer).toHaveCSS("cursor", "default");

	await window.mouse.down();
	await expect(layer).toHaveCSS("cursor", "grabbing");
	await window.mouse.up();
	await expect(layer).toHaveAttribute("data-selected", "");

	await app.close();
});

import { expect, test } from "@playwright/test";
import { launchApp } from "./support";

const BOTTOM_GAP = 24;
const EMPTY_SPOT = { x: 300, y: 600 };

test("the tool bar sits at the bottom center of the window and holds one selected tool", async () => {
	const { app, window } = await launchApp();
	const bar = window.getByRole("toolbar", { name: "Tools" });

	await expect(bar).toBeVisible();
	await expect(bar.locator(".tool-button")).toHaveCount(6);

	const placement = await bar.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return {
			centerOffset: box.left + box.width / 2 - globalThis.innerWidth / 2,
			bottomGap: globalThis.innerHeight - box.bottom,
		};
	});
	expect(Math.abs(placement.centerOffset)).toBeLessThan(1);
	expect(placement.bottomGap).toBeCloseTo(BOTTOM_GAP, 0);

	const stage = window.locator("#stage");
	const layer = window.locator(".layer");

	await expect(bar.getByLabel("Select")).toHaveAttribute("data-pressed", "");
	await expect(stage).toHaveAttribute("data-tool", "select");
	await expect(layer).toHaveCSS("cursor", "default");

	await stage.hover({ position: EMPTY_SPOT });
	await window.mouse.down();
	await expect(layer).toHaveCSS("cursor", "default");
	await window.mouse.up();

	await bar.getByLabel("Text").click();

	await expect(bar.getByLabel("Text")).toHaveAttribute("data-pressed", "");
	await expect(bar.getByLabel("Select")).not.toHaveAttribute("data-pressed", "");
	await expect(stage).toHaveAttribute("data-tool", "text");
	await expect(layer).toHaveCSS("cursor", "auto");

	await app.close();
});

test("the shape button shows the shape tool that the shape options select", async () => {
	const { app, window } = await launchApp();
	const bar = window.getByRole("toolbar", { name: "Tools" });
	const stage = window.locator("#stage");

	await bar.getByLabel("Rectangle").click();
	await expect(stage).toHaveAttribute("data-tool", "rectangle");
	await expect(window.locator(".layer")).toHaveCSS("cursor", "crosshair");

	await window.keyboard.press("o");

	await expect(stage).toHaveAttribute("data-tool", "ellipse");
	await expect(bar.getByLabel("Rectangle")).toHaveCount(0);
	await expect(bar.getByLabel("Ellipse")).toHaveAttribute("data-pressed", "");
	await expect(bar.locator(".tool-button")).toHaveCount(6);

	await app.close();
});

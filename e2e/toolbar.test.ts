import { _electron as electron, expect, test } from "@playwright/test";

const BOTTOM_GAP = 24;
const EMPTY_SPOT = 8;

test("the floating bar sits at the bottom center and holds one selected tool", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const bar = window.locator(".floating-bar");

	await expect(bar).toBeVisible();
	await expect(bar.locator(".tool-button")).toHaveCount(7);

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

	await stage.hover({ position: { x: EMPTY_SPOT, y: EMPTY_SPOT } });
	await window.mouse.down();
	await expect(layer).toHaveCSS("cursor", "default");
	await window.mouse.up();

	await bar.getByLabel("Ellipse").click();

	await expect(bar.getByLabel("Ellipse")).toHaveAttribute("data-pressed", "");
	await expect(bar.getByLabel("Select")).not.toHaveAttribute("data-pressed", "");
	await expect(stage).toHaveAttribute("data-tool", "ellipse");
	await expect(layer).toHaveCSS("cursor", "auto");

	await app.close();
});

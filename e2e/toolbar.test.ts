import { _electron as electron, expect, test } from "@playwright/test";

const BOTTOM_GAP = 24;

test("the floating bar sits at the bottom center and holds one selected tool", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const bar = window.locator(".floating-bar");

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

	await expect(bar.getByLabel("Rectangle")).toHaveAttribute("data-pressed", "");
	await bar.getByLabel("Ellipse").click();
	await expect(bar.getByLabel("Ellipse")).toHaveAttribute("data-pressed", "");
	await expect(bar.getByLabel("Rectangle")).not.toHaveAttribute("data-pressed", "");

	await app.close();
});

import { expect, test } from "@playwright/test";
import { openRenderer, rectOf } from "./support";

test("the file bar holds the File menu and the name, and has the width of the left card", async ({
	page,
}) => {
	await openRenderer(page);
	const bar = page.locator("#file-bar");

	await expect(bar.getByRole("button")).toHaveText(["File"]);
	await expect(bar.locator(".file-name")).toHaveText("Untitled");
	expect((await rectOf(bar)).width).toBe((await rectOf(page.locator("#side-panel"))).width);
});

test("the selector at the top of the left card switches between the layers and the components", async ({
	page,
}) => {
	await openRenderer(page);
	const selector = page.locator("#side-panel").getByRole("group", { name: "Panel" });
	const components = selector.getByRole("button", { name: "Components" });
	const layers = selector.getByRole("button", { name: "Layers" });

	await expect(page.locator("#layers .layer-row")).toHaveText(["Rectangle"]);
	await components.click();
	await expect(components).toHaveAttribute("aria-pressed", "true");
	await expect(page.locator("#layers")).toHaveCount(0);
	await expect(page.locator("#components")).toBeVisible();

	await layers.click();
	await expect(page.locator("#layers .layer-row")).toHaveText(["Rectangle"]);
	const both = await Promise.all([layers, components].map((button) => rectOf(button)));
	expect(both[0]?.width).toBe(both[1]?.width);
});

test("the layer list tells how to make a layer when the page has none", async ({ page }) => {
	await openRenderer(page);
	await page.locator("#layers .layer-row").click();
	await page.keyboard.press("Delete");

	await expect(page.locator(".layer")).toHaveCount(0);
	await expect(page.locator("#layers")).toContainText("The page has no layers.");
});

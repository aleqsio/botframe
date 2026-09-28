import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { EMPTY, centerOf, clickAt, dragCenterBy, openRenderer, rectOf } from "./support";

const FIXTURES = "e2e/fixtures/components";
const SCHEMES = ["light", "dark"] as const;

async function importFixtures(page: Page): Promise<Locator> {
	await page.locator("#file-bar").getByRole("button", { name: "Components" }).click();
	const card = page.getByRole("complementary", { name: "Components" });
	await card.getByLabel("Import folder").setInputFiles(FIXTURES);
	await expect(card.getByText("Imported 3 components.")).toBeVisible();
	return card;
}

async function placeCheckbox(page: Page): Promise<Locator> {
	const card = await importFixtures(page);
	await card.getByRole("button", { name: "Checkbox" }).click();
	const instance = page.locator(".layer[data-selected]");
	await expect(instance.locator(".label")).toHaveText("Accept the terms");
	return instance;
}

test("a component from a folder lands in the center of the view, hugs its markup, and takes its props from the inspector", async ({
	page,
}) => {
	await openRenderer(page);
	const instance = await placeCheckbox(page);
	const before = await rectOf(instance);
	const view = await centerOf(page.locator("#stage"));
	const placed = await centerOf(instance);
	expect(placed.x).toBeCloseTo(view.x, 0);
	expect(placed.y).toBeCloseTo(view.y, 0);
	expect(await instance.evaluate((element) => getComputedStyle(element).fontSize)).toBe("16px");

	await page.getByLabel("label", { exact: true }).fill("I agree to each of the terms");
	await page.getByLabel("label", { exact: true }).press("Enter");
	await page.getByLabel("checked", { exact: true }).check();
	await page.getByRole("combobox", { name: "size", exact: true }).selectOption("lg");

	await expect(instance.locator(".label")).toHaveText("I agree to each of the terms");
	await expect(instance.locator(".checkbox")).toHaveClass(/is-checked/u);
	await expect(instance.locator(".checkbox")).toHaveClass(/\blg\b/u);
	const after = await rectOf(instance);
	expect(after.width).toBeGreaterThan(before.width);
	const outline = await rectOf(page.locator(".selection"));
	expect(outline.width).toBeCloseTo(after.width, 0);
	expect(outline.height).toBeCloseTo(after.height, 0);
});

test("a click on an instance selects the layer and does not reach the markup inside it, and a drag moves it", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	const instance = await placeCheckbox(page);
	const center = await centerOf(instance);

	await clickAt(page, origin, EMPTY);
	await expect(page.locator(".layer[data-selected]")).toHaveCount(0);
	await page.mouse.click(center.x, center.y);

	await expect(instance).toHaveAttribute("data-selected", "");
	await expect(page.getByRole("complementary", { name: "Inspector" })).toContainText(
		"Code component",
	);
	await expect(instance.locator(".checkbox")).not.toHaveClass(/is-checked/u);
	const box = await rectOf(instance);
	await dragCenterBy(page, instance, { x: box.x + 12, y: box.y + 8 }, { x: 120, y: 90 });
});

test("the toggle switches its track and its switch state from the on prop", async ({ page }) => {
	await openRenderer(page);
	const card = await importFixtures(page);
	await card.getByRole("button", { name: "Toggle" }).click();
	const toggle = page.locator(".layer[data-selected]").locator(".toggle");
	await expect(toggle).toHaveAttribute("aria-checked", "true");

	await page.getByLabel("on", { exact: true }).uncheck();
	await page.getByRole("combobox", { name: "surface", exact: true }).selectOption("dark");

	await expect(toggle).toHaveAttribute("aria-checked", "false");
	await expect(toggle).not.toHaveClass(/is-on/u);
	await expect(toggle.locator(".label")).toHaveCSS("color", "rgb(245, 245, 247)");
});

for (const scheme of SCHEMES) {
	test(`the components card and the file bar fit their text in the ${scheme} scheme`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		await openRenderer(page);
		const card = await importFixtures(page);

		const fits = await Promise.all(
			[card, page.locator("#file-bar")].map((panel) =>
				panel.evaluate((element) => element.scrollWidth <= element.clientWidth),
			),
		);

		expect(fits).toEqual([true, true]);
	});
}

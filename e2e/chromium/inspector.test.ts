import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openRenderer, rectOf, turnLayer, typeChip } from "./support";
import type { Box } from "./support";

interface Chip {
	label: string;
	value: string;
}

const GRAB = { x: 460, y: 300 };
const CHIPS: readonly Chip[] = [
	{ label: "Rotation", value: "30" },
	{ label: "Origin X", value: "0" },
	{ label: "Origin Y", value: "50" },
];
const SCHEMES = ["light", "dark"] as const;

async function expectChipInside(page: Page, chip: Chip, panel: Box): Promise<void> {
	const field = page.getByLabel(`${chip.label} value`, { exact: true });
	await expect(field).toHaveValue(chip.value);
	const box = await rectOf(field);
	expect(box.x).toBeGreaterThanOrEqual(panel.x);
	expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
}

test("the origin chips write the transform origin, and the selection outline sits on the turned layer", async ({
	page,
}) => {
	const { layers, origin } = await openRenderer(page);
	await turnLayer(page, origin, GRAB);
	await typeChip(page, "Origin X", "0");
	await typeChip(page, "Origin Y", "50");

	await expect(layers.first()).toHaveCSS("transform-origin", "0px 80px");
	const layer = await rectOf(layers.first());
	const outline = await rectOf(page.locator(".selection"));
	expect(outline.x).toBeCloseTo(layer.x, 0);
	expect(outline.y).toBeCloseTo(layer.y, 0);
	expect(outline.width).toBeCloseTo(layer.width, 0);
	expect(outline.height).toBeCloseTo(layer.height, 0);
});

for (const scheme of SCHEMES) {
	test(`the rotation and origin chips fit the panel and show their values in the ${scheme} scheme`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		const { origin } = await openRenderer(page);
		await turnLayer(page, origin, GRAB);
		await typeChip(page, "Origin X", "0");
		await typeChip(page, "Origin Y", "50");
		const inspector = page.getByRole("complementary", { name: "Inspector" });
		const panel = await rectOf(inspector);

		await Promise.all(CHIPS.map((chip) => expectChipInside(page, chip, panel)));
		expect(await inspector.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
			true,
		);
	});
}

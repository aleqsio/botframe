import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { drawWith } from "../support";
import type { Drag, Point } from "../support";
import { EMPTY, clickAt, openRenderer } from "./support";

const FRAME: Drag = { from: { x: 300, y: 60 }, to: { x: 520, y: 240 } };
const DOT: Drag = { from: { x: 330, y: 100 }, to: { x: 420, y: 160 } };
const FRAME_EDGE = { x: 310, y: 230 };
const DOT_CENTER = { x: 370, y: 130 };
const ALARM = "rgb(255, 59, 48)";
const SCHEMES = ["light", "dark"] as const;

function inspectorOf(page: Page): Locator {
	return page.getByRole("complementary", { name: "Inspector" });
}

async function makeComponent(page: Page, origin: Point): Promise<Locator> {
	await drawWith(page, origin, "a", FRAME);
	await clickAt(page, origin, EMPTY);
	await drawWith(page, origin, "r", DOT);
	await clickAt(page, origin, FRAME_EDGE);
	const inspector = inspectorOf(page);
	await inspector.getByRole("button", { name: "Make component" }).click();
	await expect(inspector.locator(".component-heading")).toHaveText("Frame 1 · 1 copy");
	return inspector;
}

async function addToneTable(inspector: Locator): Promise<void> {
	const add = inspector.getByLabel("Add a variable", { exact: true });
	await add.selectOption("choice");
	await add.selectOption("color");
	const options = inspector.getByLabel("Choice 1 options", { exact: true });
	await options.fill("calm, alarm");
	await options.press("Enter");
	await inspector
		.getByLabel("Add a variable to the Choice 1 table", { exact: true })
		.selectOption({ label: "Color 1" });
	await inspector.getByRole("combobox", { name: "Values for" }).selectOption("alarm");
	const cell = inspector.getByLabel("Color 1 for alarm", { exact: true });
	await cell.fill("#ff3b30");
	await cell.press("Enter");
}

async function bindDotFill(page: Page, origin: Point): Promise<void> {
	await page.mouse.dblclick(origin.x + DOT_CENTER.x, origin.y + DOT_CENTER.y);
	await clickAt(page, origin, DOT_CENTER);
	await expect(page.locator(".layer[data-selected]")).toHaveAttribute("data-layer-id", /~/u);
	await inspectorOf(page).getByLabel("Fill variable", { exact: true }).click();
	await page
		.getByRole("button", { name: /Color 1/u })
		.first()
		.click();
}

test("a frame becomes a component whose copies stay in sync, and a prop on one copy drives a table value inside it", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	const inspector = await makeComponent(page, origin);
	await addToneTable(inspector);
	await bindDotFill(page, origin);
	await expect(inspector).toContainText("Color 1");

	await clickAt(page, origin, EMPTY);
	await clickAt(page, origin, FRAME_EDGE);
	await page.keyboard.press("ControlOrMeta+d");
	await expect(inspector.locator(".component-heading")).toHaveText("Frame 1 · 2 copies");
	await inspector.getByRole("combobox", { name: "Choice 1", exact: true }).selectOption("alarm");

	const dots = page.locator('.layer[data-layer-id*="~"]');
	await expect(dots).toHaveCount(2);
	await expect(page.locator(".layer[data-selected] .layer")).toHaveCSS("background-color", ALARM);
	await expect(dots.nth(0)).not.toHaveCSS("background-color", ALARM);
	await expect(inspector).toContainText("from Choice 1: alarm");
});

for (const scheme of SCHEMES) {
	test(`the component panels fit their text in the ${scheme} scheme`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		const { origin } = await openRenderer(page);
		const inspector = await makeComponent(page, origin);
		await addToneTable(inspector);

		const overflow = await inspector
			.locator(".variable-row, .choice-table, .component-actions")
			.evaluateAll((rows) => rows.filter((row) => row.scrollWidth > row.clientWidth).length);

		expect(overflow).toBe(0);
	});
}

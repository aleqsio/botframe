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

async function addSwitchProp(inspector: Locator): Promise<void> {
	await inspector.locator(".new-variable").getByRole("button", { name: "Switch" }).click();
	await expect(inspector.getByLabel("switch 1 name", { exact: true })).toBeVisible();
}

async function fillWhenSwitchIsOn(page: Page, origin: Point): Promise<void> {
	await page.mouse.dblclick(origin.x + DOT_CENTER.x, origin.y + DOT_CENTER.y);
	await clickAt(page, origin, DOT_CENTER);
	await expect(page.locator(".layer[data-selected]")).toHaveAttribute("data-layer-id", /~/u);
	await inspectorOf(page)
		.getByRole("button", { name: "Fill: use a variable or a condition", exact: true })
		.click();
	await page.getByRole("button", { name: "Add a condition" }).click();
	const result = page.getByLabel("Case 1 result", { exact: true });
	await result.fill("#ff3b30");
	await result.press("Enter");
	await page.keyboard.press("Escape");
}

test("a frame becomes a component whose copies stay in sync, and a prop on one copy drives a condition inside it", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	const inspector = await makeComponent(page, origin);
	await addSwitchProp(inspector);
	await fillWhenSwitchIsOn(page, origin);
	await expect(inspector.locator(".bound-line")).toContainText("when switch 1 is on");

	await clickAt(page, origin, EMPTY);
	await clickAt(page, origin, FRAME_EDGE);
	await page.keyboard.press("ControlOrMeta+d");
	await expect(inspector.locator(".component-heading")).toHaveText("Frame 1 · 2 copies");
	await inspector.getByRole("checkbox", { name: "switch 1", exact: true }).check();

	const dots = page.locator('.layer[data-layer-id*="~"]');
	await expect(dots).toHaveCount(2);
	await expect(page.locator(".layer[data-selected] .layer")).toHaveCSS("background-color", ALARM);
	await expect(dots.nth(0)).not.toHaveCSS("background-color", ALARM);
});

test("a field makes a document variable from its value and shows it as a chip", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	await clickAt(page, origin, { x: 540, y: 340 });
	const inspector = inspectorOf(page);
	await inspector
		.getByRole("button", { name: "Fill: use a variable or a condition", exact: true })
		.click();
	await page.getByRole("button", { name: "Make a document variable" }).click();

	await expect(inspector.locator(".variable-chip")).toHaveText("fill");
	await expect(
		inspector.getByRole("button", { name: "Fill: change the variable", exact: true }),
	).toBeVisible();
});

for (const scheme of SCHEMES) {
	test(`the component panels fit their text in the ${scheme} scheme`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		const { origin } = await openRenderer(page);
		const inspector = await makeComponent(page, origin);
		await addSwitchProp(inspector);

		const overflow = await inspector
			.locator(".variable-row, .prop-row, .value-control, .component-actions, .new-variable")
			.evaluateAll((rows) => rows.filter((row) => row.scrollWidth > row.clientWidth).length);

		expect(overflow).toBe(0);
	});
}

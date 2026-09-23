import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { drawWith } from "../support";
import type { Drag } from "../support";
import { clickAt, openRenderer, typeChip } from "./support";

const FRAME: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const INSIDE: Drag = { from: { x: 320, y: 80 }, to: { x: 420, y: 140 } };
const FRAME_EDGE = { x: 290, y: 170 };
const CHILD = { x: 370, y: 110 };
const PADDING = "24";

function arrangeButton(page: Page, label: string): Locator {
	return page.getByRole("region", { name: "Arrange" }).getByRole("button", { name: label });
}

function chipValue(page: Page, label: string): Locator {
	return page.getByLabel(`${label} value`, { exact: true });
}

test("an align to the frame stops at the padding of the frame", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "a", FRAME);
	await drawWith(page, origin, "r", INSIDE);
	await clickAt(page, origin, FRAME_EDGE);
	await typeChip(page, "Padding", PADDING);
	await clickAt(page, origin, CHILD);

	await arrangeButton(page, "Align left").click();
	await arrangeButton(page, "Align top").click();

	await expect(chipValue(page, "X")).toHaveValue(PADDING);
	await expect(chipValue(page, "Y")).toHaveValue(PADDING);
});

test("the section shows the align row and keeps the other actions in the menu", async ({
	page,
}) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "a", FRAME);
	await drawWith(page, origin, "r", INSIDE);

	await expect(
		page.getByRole("region", { name: "Arrange" }).getByRole("button", { name: /^Align/u }),
	).toHaveCount(6);
	await arrangeButton(page, "More arrange actions").click();
	await expect(page.getByRole("menuitem")).toHaveCount(11);
});

test("an action that is off keeps a tip that tells what it needs", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", INSIDE);
	await expect(arrangeButton(page, "Align left")).toHaveAttribute(
		"title",
		/^Align left \(.+\)\nSelect two or more layers/u,
	);
	await arrangeButton(page, "More arrange actions").click();
	const spread = page.getByRole("menuitem", { name: "Distribute horizontally" });

	await expect(spread).toBeDisabled();
	await expect(spread).toHaveAttribute("title", /Select three or more layers/u);
	await expect(page.getByRole("menuitem", { name: "Swap width and height" })).toBeEnabled();
});

test("an off align button does nothing on a click", async ({ page }) => {
	const { origin } = await openRenderer(page);
	await drawWith(page, origin, "r", INSIDE);
	const before = await chipValue(page, "X").inputValue();

	await arrangeButton(page, "Align left").click({ force: true });

	await expect(chipValue(page, "X")).toHaveValue(before);
});

import { expect, test } from "@playwright/test";
import { closeWelcome } from "../support";
import { loadRenderer } from "./support";

const WRITE_WAIT_MS = 1000;

test("the first launch opens the welcome document, and the File menu opens it again", async ({
	page,
}) => {
	await loadRenderer(page);
	const tabs = page.getByRole("tab");
	await expect(tabs).toHaveText(["Welcome"]);
	await expect(page.locator(".layer", { hasText: "Welcome to botframe" }).first()).toBeVisible();

	await closeWelcome(page);
	await page.waitForTimeout(WRITE_WAIT_MS);
	await page.reload();
	await expect(tabs).toHaveText(["Untitled"]);

	await page.getByRole("button", { name: "File", exact: true }).click();
	await page.getByRole("menuitem", { name: "Open Welcome Project" }).click();
	await expect(tabs).toHaveText(["Untitled", "Welcome"]);
	await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
});

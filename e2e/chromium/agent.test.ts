import { expect, test } from "@playwright/test";
import { openRenderer } from "./support";

const PAGE_URL = "http://127.0.0.1:7341/page";
const ADD_COMMAND = "claude mcp add --transport http botframe http://127.0.0.1:7341/mcp";
const HOLD_MS = 500;

test("the Agent button shows how to connect, and the page connects to the server", async ({
	page,
}) => {
	await page.route(PAGE_URL, async (route) => {
		await new Promise((resolve) => {
			setTimeout(resolve, HOLD_MS);
		});
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			headers: { "Access-Control-Allow-Origin": "*" },
			body: "null",
		});
	});
	await openRenderer(page);

	await page.getByRole("button", { name: "Agent" }).click();
	await expect(page.getByText("bun run agent", { exact: true })).toBeVisible();
	await expect(page.getByText(ADD_COMMAND, { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Connect" }).click();
	await expect(page.getByText(/^Connected\./u)).toBeVisible();
	await expect(page.getByRole("button", { name: "Disconnect" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);

	await page.getByRole("button", { name: "Disconnect" }).click();
	await expect(page.getByText("Not connected.")).toBeVisible();
});

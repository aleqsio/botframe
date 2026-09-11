import { expect, test } from "@playwright/test";
import { launchApp } from "./support";

test("the Layers button of the file pill takes the layer card away and brings it back", async () => {
	const { app, window } = await launchApp();
	const toggle = window.locator("#file-bar").getByRole("button", { name: "Layers" });
	const card = window.locator("#layers");

	await expect(window.locator("#file-bar .file-name")).toHaveText("Untitled");
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(card).toHaveCount(1);

	await toggle.click();

	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await expect(card).toHaveCount(0);

	await toggle.click();

	await expect(card).toHaveCount(1);
	await expect(card.locator(".layer-row")).toHaveText(["Rectangle"]);

	await app.close();
});

test("the zoom pill steps the zoom of the canvas in and out", async () => {
	const { app, window } = await launchApp();
	const zoom = window.getByRole("group", { name: "Zoom" });
	const viewport = window.locator("#viewport");

	await expect(zoom.locator("output")).toHaveText("100%");

	await zoom.getByRole("button", { name: "Zoom in" }).click();

	await expect(zoom.locator("output")).toHaveText("200%");
	await expect(viewport).toHaveAttribute("style", /scale\(2\)/u);

	await zoom.getByRole("button", { name: "Zoom out" }).click();

	await expect(zoom.locator("output")).toHaveText("100%");
	await expect(viewport).toHaveAttribute("style", /scale\(1\)/u);

	await app.close();
});

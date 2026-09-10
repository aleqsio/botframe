import { expect, test } from "@playwright/test";
import { launchApp } from "./support";

const HAIRLINE = "rgba(255, 255, 255, 0.17) 0px 0px 0px 0.5px inset";

test("the canvas keeps its color, its radius and a hairline above the layers", async () => {
	const { app, window } = await launchApp();
	const stage = window.locator("#stage");

	await expect(stage).toBeVisible();
	await expect(stage).toHaveCSS("background-color", "rgb(22, 22, 28)");
	await expect(stage).toHaveCSS("border-radius", "4px");

	const chrome = await stage.evaluate((element) => {
		const style = getComputedStyle(element, "::after");
		return { shadow: style.boxShadow, pointerEvents: style.pointerEvents };
	});

	expect(chrome.shadow).toBe(HAIRLINE);
	expect(chrome.pointerEvents).toBe("none");

	const childIds = await stage.evaluate((element) =>
		[...element.children].map((child) => child.id),
	);

	expect(childIds.at(-1)).toBe("viewport");

	await window.emulateMedia({ colorScheme: "light" });

	await expect(window.locator("#layers")).toHaveCSS("color", "rgba(255, 255, 255, 0.92)");
	await app.close();
});

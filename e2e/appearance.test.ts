import { _electron as electron, expect, test } from "@playwright/test";

const HAIRLINE = "rgb(255, 0, 0) 0px 0px 0px 1px inset";
const INNER = "rgba(0, 0, 0, 0.12) 0px 0px 12px 0px inset";

test("the appearance panel drives the stage", async () => {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	const stage = window.locator("#stage");
	const stageShadow = window.locator("#stage-shadow");

	await expect(stageShadow).toHaveCSS("box-shadow", "none");

	await window.locator("#appearance-canvas").fill("#0d99ff");

	await expect(stage).toHaveCSS("background-color", "rgb(13, 153, 255)");

	await window.locator('.appearance-width[data-width="1"]').click();
	await window.locator("#appearance-border-ink-color").fill("#ff0000");
	await window.locator("#appearance-border-ink-opacity").fill("1");

	await expect(window.locator('.appearance-width[data-width="1"]')).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(stageShadow).toHaveCSS("box-shadow", HAIRLINE);

	await window.locator("#appearance-shadow-blur").fill("12");

	await expect(stageShadow).toHaveCSS("box-shadow", `${HAIRLINE}, ${INNER}`);

	await window.locator("#appearance-tint-color").fill("#1e1e28");
	await window.locator("#appearance-tint-opacity").fill("0.5");

	await expect(window.locator("#app-tint")).toHaveCSS("background-color", "rgba(30, 30, 40, 0.5)");

	await window.getByRole("button", { name: "Slate" }).click();

	await expect(stage).toHaveCSS("background-color", "rgb(22, 22, 28)");
	await expect(stage).toHaveCSS("border-radius", "14px");
	await expect(stageShadow).toHaveCSS(
		"box-shadow",
		"rgba(255, 255, 255, 0.12) 0px 0px 0px 0.5px inset, rgba(0, 0, 0, 0.55) 0px 1px 12px 2px inset",
	);

	await window.locator("#appearance-radius").focus();
	await window.keyboard.press("ArrowRight");

	await expect(stage).toHaveCSS("border-radius", "15px");

	await app.close();
});

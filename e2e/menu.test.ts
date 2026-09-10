import { expect, test } from "@playwright/test";
import { at, launchApp, stageOrigin } from "./support";

const GRAB = { x: 460, y: 300 };
const DELTA = { x: 60, y: 40 };

test("the secondary press lists the layer under the pointer and selects it", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const menu = window.locator(".layer-menu");
	const item = menu.getByRole("menuitem");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);
	const press = at(origin, GRAB);

	await window.mouse.move(press.x, press.y);
	await window.mouse.down({ button: "right" });
	await window.mouse.up({ button: "right" });

	await expect(menu).toBeVisible();
	await expect(item).toHaveCount(1);
	await expect(item).toHaveText("Rectangle");
	await expect(item.locator(".layer-menu-swatch")).toHaveCSS("background-color", "rgb(0, 0, 0)");

	await window.keyboard.press("ArrowDown");
	await expect(item).toHaveAttribute("data-highlighted", "");

	await window.keyboard.press("Escape");
	await expect(menu).toBeHidden();
	await expect(layer).not.toHaveAttribute("data-selected", "");

	await window.mouse.down({ button: "right" });
	await window.mouse.up({ button: "right" });
	await expect(item).toBeVisible();
	await item.click();

	await expect(menu).toBeHidden();
	await expect(layer).toHaveAttribute("data-selected", "");

	await window.mouse.move(press.x, press.y);
	await window.mouse.down();
	await window.mouse.move(press.x + DELTA.x, press.y + DELTA.y, { steps: 4 });
	await window.mouse.down({ button: "right" });
	await window.mouse.up({ button: "right" });

	await expect(menu).toBeHidden();

	await window.mouse.up();
	await expect(layer).toHaveAttribute("style", /translate3d\(480px, 300px, 0px\)/u);

	await app.close();
});

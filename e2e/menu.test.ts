import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { EDIT_LABELS, at, launchApp, menuItem, pressRight, stageOrigin } from "./support";

const GRAB = { x: 460, y: 300 };
const EMPTY = { x: 700, y: 480 };
const DELTA = { x: 60, y: 40 };
const LAYERS_LABEL = "Layers under the pointer";
const APPLE = process.platform === "darwin";
const PASTE_ACCELERATOR = APPLE ? "⌘V" : "Ctrl+V";

function editGroup(menu: Locator): Locator {
	return menu.getByRole("group", { name: "Edit" });
}

function disabledItems(menu: Locator): Locator {
	return editGroup(menu).locator("[aria-disabled='true']");
}

function layerGroup(menu: Locator): Locator {
	return menu.getByRole("group", { name: LAYERS_LABEL });
}

test("the secondary press lists the layer under the pointer and selects it", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const menu = window.locator(".layer-menu");
	const item = layerGroup(menu).getByRole("menuitem");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);
	const press = at(origin, GRAB);

	await pressRight(window, press);

	await expect(menu).toBeVisible();
	await expect(item).toHaveCount(1);
	await expect(item).toHaveText("Rectangle");
	await expect(item.locator(".layer-menu-swatch")).toHaveCSS("background-color", "rgb(0, 0, 0)");
	await expect(menu.getByRole("menuitem")).toHaveCount(1 + EDIT_LABELS.length);
	await expect(editGroup(menu).locator(".layer-menu-label")).toHaveText(EDIT_LABELS);

	await window.keyboard.press("ArrowDown");
	await expect(item).toHaveAttribute("data-highlighted", "");

	await window.keyboard.press("Escape");
	await expect(menu).toBeHidden();
	await expect(layer).toHaveAttribute("data-selected", "");

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

test("the secondary press on a layer takes it away with the Delete command", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const menu = window.locator(".layer-menu");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);

	await pressRight(window, at(origin, GRAB));

	await expect(menu).toBeVisible();
	await expect(layer).toHaveAttribute("data-selected", "");

	await menuItem(menu, "Delete").click();

	await expect(menu).toBeHidden();
	await expect(layer).toHaveCount(0);

	await app.close();
});

test("the secondary press shows the generic section alone on the empty stage and with the hand tool", async () => {
	const { app, window } = await launchApp();
	const menu = window.locator(".layer-menu");

	await expect(window.locator(".layer")).toBeVisible();
	const origin = await stageOrigin(window);

	await pressRight(window, at(origin, EMPTY));

	await expect(menu).toBeVisible();
	await expect(layerGroup(menu)).toHaveCount(0);
	await expect(menu.getByRole("menuitem")).toHaveCount(EDIT_LABELS.length);
	await expect(editGroup(menu).locator(".layer-menu-label")).toHaveText(EDIT_LABELS);
	await expect(menuItem(menu, "Paste").locator(".layer-menu-accelerator")).toHaveText(
		PASTE_ACCELERATOR,
	);

	await window.keyboard.press("Escape");
	await window.keyboard.press("h");
	await pressRight(window, at(origin, GRAB));

	await expect(menu).toBeVisible();
	await expect(layerGroup(menu)).toHaveCount(0);
	await expect(menu.getByRole("menuitem")).toHaveCount(EDIT_LABELS.length);

	await app.close();
});

test("the generic section disables a command that cannot run", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const menu = window.locator(".layer-menu");
	const items = editGroup(menu).getByRole("menuitem");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);

	await pressRight(window, at(origin, EMPTY));
	await expect(menu).toBeVisible();
	await expect(items).toHaveCount(EDIT_LABELS.length);
	await expect(disabledItems(menu)).toHaveCount(EDIT_LABELS.length);

	await window.keyboard.press("Escape");
	await layer.click();
	await expect(layer).toHaveAttribute("data-selected", "");

	await pressRight(window, at(origin, GRAB));
	await expect(menu).toBeVisible();
	await expect(items.nth(0)).toBeEnabled();
	await expect(items.nth(1)).toBeEnabled();
	await expect(items.nth(2)).toBeEnabled();
	await expect(items.nth(3)).toBeDisabled();
	await expect(items.nth(4)).toBeEnabled();
	await expect(items.nth(5)).toBeEnabled();
	await expect(disabledItems(menu)).toHaveCount(1);

	await app.close();
});

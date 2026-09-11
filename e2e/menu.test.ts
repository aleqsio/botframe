import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { at, launchApp, stageOrigin } from "./support";

const GRAB = { x: 460, y: 300 };
const EMPTY = { x: 700, y: 480 };
const DELTA = { x: 60, y: 40 };
const LAYERS_LABEL = "Layers under the pointer";
const CLIPBOARD_LABELS = ["Cut", "Copy", "Copy as", "Paste"];
const APPLE = process.platform === "darwin";
const PASTE_ACCELERATOR = APPLE ? "⌘V" : "Ctrl+V";

function clipboardGroup(menu: Locator): Locator {
	return menu.getByRole("group", { name: "Clipboard" });
}

function disabledItems(menu: Locator): Locator {
	return clipboardGroup(menu).locator("[aria-disabled='true']");
}

function layerGroup(menu: Locator): Locator {
	return menu.getByRole("group", { name: LAYERS_LABEL });
}

async function pressRight(window: Page, point: { x: number; y: number }): Promise<void> {
	await window.mouse.move(point.x, point.y);
	await window.mouse.down({ button: "right" });
	await window.mouse.up({ button: "right" });
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
	await expect(menu.getByRole("menuitem")).toHaveCount(1 + CLIPBOARD_LABELS.length);
	await expect(clipboardGroup(menu).locator(".layer-menu-label")).toHaveText(CLIPBOARD_LABELS);

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

test("the secondary press shows the generic section alone on the empty stage and with the hand tool", async () => {
	const { app, window } = await launchApp();
	const menu = window.locator(".layer-menu");

	await expect(window.locator(".layer")).toBeVisible();
	const origin = await stageOrigin(window);

	await pressRight(window, at(origin, EMPTY));

	await expect(menu).toBeVisible();
	await expect(layerGroup(menu)).toHaveCount(0);
	await expect(menu.getByRole("menuitem")).toHaveCount(CLIPBOARD_LABELS.length);
	await expect(clipboardGroup(menu).locator(".layer-menu-label")).toHaveText(CLIPBOARD_LABELS);
	await expect(clipboardGroup(menu).locator(".layer-menu-accelerator").last()).toHaveText(
		PASTE_ACCELERATOR,
	);

	await window.keyboard.press("Escape");
	await window.keyboard.press("h");
	await pressRight(window, at(origin, GRAB));

	await expect(menu).toBeVisible();
	await expect(layerGroup(menu)).toHaveCount(0);
	await expect(menu.getByRole("menuitem")).toHaveCount(CLIPBOARD_LABELS.length);

	await app.close();
});

test("the generic section disables a command that cannot run", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const menu = window.locator(".layer-menu");
	const items = clipboardGroup(menu).getByRole("menuitem");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);

	await pressRight(window, at(origin, EMPTY));
	await expect(menu).toBeVisible();
	await expect(items).toHaveCount(CLIPBOARD_LABELS.length);
	await expect(disabledItems(menu)).toHaveCount(CLIPBOARD_LABELS.length);

	await window.keyboard.press("Escape");
	await layer.click();
	await expect(layer).toHaveAttribute("data-selected", "");

	await pressRight(window, at(origin, GRAB));
	await expect(menu).toBeVisible();
	await expect(items.nth(0)).toBeEnabled();
	await expect(items.nth(1)).toBeEnabled();
	await expect(items.nth(2)).toBeEnabled();
	await expect(items.nth(3)).toBeDisabled();
	await expect(disabledItems(menu)).toHaveCount(1);

	await app.close();
});

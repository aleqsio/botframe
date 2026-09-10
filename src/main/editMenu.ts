import { Menu, app } from "electron";
import type { BrowserWindow, MenuItemConstructorOptions } from "electron";
import { EDIT_COMMAND } from "../shared/editMenu";
import type { EditMenuItem } from "../shared/editMenu";

function isEditMenuItem(value: unknown): value is EditMenuItem {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const item = value as Partial<Record<keyof EditMenuItem, unknown>>;
	return (
		typeof item.id === "string" &&
		typeof item.label === "string" &&
		typeof item.accelerator === "string" &&
		typeof item.enabled === "boolean"
	);
}

function readItems(value: unknown): EditMenuItem[] {
	const list = Array.isArray(value) ? (value as readonly unknown[]) : [];
	return list.flatMap((entry) => (isEditMenuItem(entry) ? [entry] : []));
}

function sendCommand(window: BrowserWindow, id: string): void {
	if (!window.isDestroyed()) {
		window.webContents.send(EDIT_COMMAND, id);
	}
}

function commandItem(item: EditMenuItem, window: BrowserWindow): MenuItemConstructorOptions {
	const children = item.submenu;
	if (children !== undefined) {
		return {
			label: item.label,
			enabled: item.enabled,
			submenu: children.map((child) => commandItem(child, window)),
		};
	}
	return {
		label: item.label,
		...(item.accelerator === "" ? {} : { accelerator: item.accelerator }),
		// The renderer runs the command, so the menu shows the accelerator but does not claim
		// the key. https://www.electronjs.org/docs/latest/api/menu-item#menuitemregisteraccelerator
		registerAccelerator: false,
		enabled: item.enabled,
		click: () => {
			sendCommand(window, item.id);
		},
	};
}

function withSeparators(
	items: readonly EditMenuItem[],
	window: BrowserWindow,
): MenuItemConstructorOptions[] {
	return items.flatMap((item) =>
		item.separatorBefore === true
			? [{ type: "separator" as const }, commandItem(item, window)]
			: [commandItem(item, window)],
	);
}

function firstMenu(): MenuItemConstructorOptions {
	if (process.platform === "darwin") {
		return {
			label: app.name,
			submenu: [
				{ role: "about" },
				{ type: "separator" },
				{ role: "hide" },
				{ type: "separator" },
				{ role: "quit" },
			],
		};
	}
	return { label: "File", submenu: [{ role: "quit" }] };
}

export function setEditMenu(value: unknown, window: BrowserWindow): void {
	const edit = withSeparators(readItems(value), window);
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([firstMenu(), { label: "Edit", submenu: edit }, { role: "windowMenu" }]),
	);
}

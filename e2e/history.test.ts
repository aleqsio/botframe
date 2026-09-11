import { expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { EDIT_COMMAND } from "../src/shared/editMenu";
import { at, openStage } from "./support";

const FIRST = { press: { x: 280, y: 40 }, release: { x: 480, y: 180 } };
const SECOND = { press: { x: 520, y: 40 }, release: { x: 640, y: 140 } };
const APPLE = process.platform === "darwin";
const UNDO = APPLE ? "Meta+z" : "Control+z";
const REDO = APPLE ? "Meta+Shift+z" : "Control+y";

interface Point {
	x: number;
	y: number;
}

interface MenuState {
	label: string;
	enabled: boolean;
}

function historyMenu(app: ElectronApplication): Promise<MenuState[]> {
	return app.evaluate(({ Menu }) => {
		const edit = Menu.getApplicationMenu()?.items.find((item) => item.label === "Edit");
		const history = new Set(["Undo", "Redo"]);
		return (edit?.submenu?.items ?? [])
			.filter((item) => history.has(item.label))
			.map((item) => ({ label: item.label, enabled: item.enabled }));
	});
}

function sendCommand(app: ElectronApplication, id: string): Promise<void> {
	return app.evaluate(
		({ BrowserWindow }, command) => {
			BrowserWindow.getAllWindows()[0]?.webContents.send(command.channel, command.id);
		},
		{ channel: EDIT_COMMAND, id },
	);
}

async function drawRectangle(
	window: Page,
	origin: Point,
	box: { press: Point; release: Point },
): Promise<void> {
	await window.keyboard.press("r");
	await window.mouse.move(at(origin, box.press).x, at(origin, box.press).y);
	await window.mouse.down();
	await window.mouse.move(at(origin, box.release).x, at(origin, box.release).y, { steps: 8 });
	await window.mouse.up();
}

test("one undo takes one drawn rectangle away, and redo brings it back", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawRectangle(window, origin, FIRST);
	await drawRectangle(window, origin, SECOND);
	await expect(layers).toHaveCount(3);

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveCSS("width", "200px");

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(1);

	await window.keyboard.press(REDO);
	await window.keyboard.press(REDO);
	await expect(layers).toHaveCount(3);
	await expect(layers.nth(1)).toHaveCSS("width", "200px");
	await expect(layers.nth(2)).toHaveCSS("width", "120px");

	await app.close();
});

test("the Edit menu follows the history of the document", async () => {
	const { app, layers, origin, window } = await openStage();

	await expect
		.poll(() => historyMenu(app))
		.toEqual([
			{ label: "Undo", enabled: false },
			{ label: "Redo", enabled: false },
		]);

	await drawRectangle(window, origin, FIRST);
	await expect(layers).toHaveCount(2);
	await expect
		.poll(() => historyMenu(app))
		.toEqual([
			{ label: "Undo", enabled: true },
			{ label: "Redo", enabled: false },
		]);

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(1);
	await expect
		.poll(() => historyMenu(app))
		.toEqual([
			{ label: "Undo", enabled: false },
			{ label: "Redo", enabled: true },
		]);

	await sendCommand(app, "sabotage");
	await sendCommand(app, "redo");
	await expect(layers).toHaveCount(2);
	await expect(layers.nth(1)).toHaveCSS("width", "200px");

	await app.close();
});

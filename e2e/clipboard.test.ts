import { expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { HTML_FLAVOR, LAYERS_FLAVOR } from "../src/shared/clipboard";
import { at, openStage } from "./support";

const APPLE = process.platform === "darwin";
const COPY = APPLE ? "Meta+c" : "Control+c";
const CUT = APPLE ? "Meta+x" : "Control+x";
const PASTE = APPLE ? "Meta+v" : "Control+v";
const UNDO = APPLE ? "Meta+z" : "Control+z";

interface Point {
	x: number;
	y: number;
}

interface MenuEntry {
	label: string;
	enabled: boolean;
	children: string[];
}

const ARTBOARD = { press: { x: 40, y: 40 }, release: { x: 240, y: 180 } };
const OVER_EMPTY = { x: 500, y: 300 };

function clipboardFlavors(app: ElectronApplication): Promise<boolean> {
	return app.evaluate(({ clipboard }, flavor) => clipboard.has(flavor), LAYERS_FLAVOR);
}

async function clipboardHtml(app: ElectronApplication): Promise<string> {
	const html: unknown = await app.evaluate(async ({ clipboard }, flavor) => {
		const items = await clipboard.read();
		const item = items.find((entry) => entry.types.includes(flavor));
		const blob = await item?.getType(flavor);
		return blob instanceof Blob ? await blob.text() : "";
	}, HTML_FLAVOR);
	return typeof html === "string" ? html : "";
}

function editItems(app: ElectronApplication): Promise<MenuEntry[]> {
	return app.evaluate(({ Menu }) => {
		const edit = Menu.getApplicationMenu()?.items.find((item) => item.label === "Edit");
		return (edit?.submenu?.items ?? []).map((item) => ({
			label: item.label,
			enabled: item.enabled,
			children: (item.submenu?.items ?? []).map((child) => child.label),
		}));
	});
}

async function editLabels(app: ElectronApplication): Promise<string[]> {
	return (await editItems(app)).map((item) => item.label);
}

async function copyAsLabels(app: ElectronApplication): Promise<string[]> {
	const items = await editItems(app);
	return items.find((item) => item.label === "Copy as")?.children ?? [];
}

async function enabledOf(app: ElectronApplication, label: string): Promise<boolean> {
	const items = await editItems(app);
	return items.find((item) => item.label === label)?.enabled ?? false;
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

test("a copy and a paste give a second layer with the same box", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawRectangle(window, origin, ARTBOARD);
	await expect(layers).toHaveCount(2);
	const drawn = layers.nth(1);
	await expect(drawn).toHaveAttribute("data-selected", "");

	await window.keyboard.press(COPY);
	await expect.poll(() => clipboardFlavors(app)).toBe(true);
	expect(await clipboardHtml(app)).toContain("<div");

	await window.mouse.move(at(origin, OVER_EMPTY).x, at(origin, OVER_EMPTY).y);
	await window.keyboard.press(PASTE);
	await expect(layers).toHaveCount(3);

	const first = await layers.nth(1).getAttribute("data-layer-id");
	const second = await layers.nth(2).getAttribute("data-layer-id");
	expect(second).not.toBe(first);
	await expect(layers.nth(2)).toHaveCSS("width", "200px");
	await expect(layers.nth(2)).toHaveCSS("height", "140px");

	await app.close();
});

test("the Edit menu holds the clipboard commands and a Copy as submenu", async () => {
	const { app, layers, origin, window } = await openStage();

	expect(await editLabels(app)).toEqual(["Undo", "Redo", "", "Cut", "Copy", "Copy as", "Paste"]);
	expect(await copyAsLabels(app)).toEqual(["HTML"]);

	await drawRectangle(window, origin, ARTBOARD);
	await expect(layers).toHaveCount(2);
	await expect.poll(() => enabledOf(app, "Copy as")).toBe(true);

	await app.close();
});

test("a cut takes the layer away, and one undo brings it back", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawRectangle(window, origin, ARTBOARD);
	await expect(layers).toHaveCount(2);

	await window.keyboard.press(CUT);
	await expect(layers).toHaveCount(1);
	await expect.poll(() => clipboardFlavors(app)).toBe(true);

	await window.keyboard.press(UNDO);
	await expect(layers).toHaveCount(2);

	await app.close();
});

test("a copy inside a text field of the panel stays a text copy", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawRectangle(window, origin, ARTBOARD);
	await expect(layers).toHaveCount(2);
	await app.evaluate(({ clipboard }) => {
		clipboard.clear();
	});

	const name = window.getByLabel("Name");
	await name.fill("Panel name");
	await name.selectText();
	await window.keyboard.press(COPY);

	await expect.poll(() => clipboardFlavors(app)).toBe(false);
	await expect(layers).toHaveCount(2);

	await app.close();
});

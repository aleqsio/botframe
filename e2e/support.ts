import { _electron as electron, expect } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";

export interface Point {
	x: number;
	y: number;
}

export interface Drag {
	from: Point;
	to: Point;
}

export async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	return { app, window };
}

export function stageOrigin(window: Page): Promise<Point> {
	return window.locator("#stage").evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.left, y: box.top };
	});
}

export const EDIT_LABELS = ["Cut", "Copy", "Copy as", "Paste", "Duplicate", "Delete"];

export async function pressRight(window: Page, point: Point): Promise<void> {
	await window.mouse.move(point.x, point.y);
	await window.mouse.down({ button: "right" });
	await window.mouse.up({ button: "right" });
}

export async function clickAt(
	window: Page,
	point: Point,
	modifier: string | null = null,
): Promise<void> {
	if (modifier !== null) {
		await window.keyboard.down(modifier);
	}
	await window.mouse.move(point.x, point.y);
	await window.mouse.down();
	await window.mouse.up();
	if (modifier !== null) {
		await window.keyboard.up(modifier);
	}
}

export function menuItem(menu: Locator, label: string): Locator {
	return menu.locator(".layer-menu-item", { hasText: label });
}

export function at(origin: Point, point: Point): Point {
	return { x: origin.x + point.x, y: origin.y + point.y };
}

export async function pressInto(window: Page, origin: Point, drag: Drag): Promise<void> {
	await window.mouse.move(at(origin, drag.from).x, at(origin, drag.from).y);
	await window.mouse.down();
	await window.mouse.move(at(origin, drag.to).x, at(origin, drag.to).y, { steps: 8 });
}

export async function dragOn(window: Page, origin: Point, drag: Drag): Promise<void> {
	await pressInto(window, origin, drag);
	await window.mouse.up();
}

export async function drawWith(
	window: Page,
	origin: Point,
	key: string,
	drag: Drag,
): Promise<void> {
	await window.keyboard.press(key);
	await dragOn(window, origin, drag);
}

export async function boxOf(locator: Locator): Promise<Point> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box");
	}
	return { x: box.x, y: box.y };
}

export async function openStage(): Promise<{
	app: ElectronApplication;
	layers: Locator;
	origin: Point;
	stage: Locator;
	window: Page;
}> {
	const { app, window } = await launchApp();
	const layers = window.locator(".layer");
	await expect(layers).toHaveCount(1);
	return {
		app,
		layers,
		origin: await stageOrigin(window),
		stage: window.locator("#stage"),
		window,
	};
}

import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { join } from "node:path";
import { dragOn, stageOrigin } from "../support";
import type { Point } from "../support";

const SITE = "https://botframe.test";
const RENDERER = "out/renderer";
const NEAR = 0.05;

interface Scene {
	layers: Locator;
	origin: Point;
}

function fileOf(url: string): string {
	const { pathname } = new URL(url);
	return join(RENDERER, pathname === "/" ? "index.html" : pathname);
}

export async function openRenderer(page: Page): Promise<Scene> {
	await page.route(`${SITE}/**`, (route) => route.fulfill({ path: fileOf(route.request().url()) }));
	await page.goto(`${SITE}/`);
	const layers = page.locator(".layer");
	await expect(layers).toHaveCount(1);
	return { layers, origin: await stageOrigin(page) };
}

export interface Box extends Point {
	width: number;
	height: number;
}

export async function rectOf(locator: Locator): Promise<Box> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box");
	}
	return box;
}

async function centerOf(locator: Locator): Promise<Point> {
	const box = await rectOf(locator);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function dragCenterBy(
	page: Page,
	layer: Locator,
	grab: Point,
	delta: Point,
): Promise<void> {
	const before = await centerOf(layer);
	await dragOn(
		page,
		{ x: 0, y: 0 },
		{ from: grab, to: { x: grab.x + delta.x, y: grab.y + delta.y } },
	);
	await expect
		.poll(async () => {
			const after = await centerOf(layer);
			return Math.hypot(after.x - before.x - delta.x, after.y - before.y - delta.y);
		})
		.toBeLessThan(NEAR);
}

export async function typeChip(page: Page, label: string, text: string): Promise<void> {
	const field = page.getByLabel(`${label} value`, { exact: true });
	await field.fill(text);
	await field.press("Enter");
}

export async function turnLayer(page: Page, origin: Point, grab: Point): Promise<void> {
	await page.mouse.click(origin.x + grab.x, origin.y + grab.y);
	await typeChip(page, "Rotation", "30");
	await expect(page.locator(".layer[data-selected]")).toHaveAttribute("style", /rotate\(30deg\)/u);
}

export async function makeRow(page: Page, origin: Point, scene: Scene): Promise<Locator> {
	const child = scene.layers.nth(2);
	await page.mouse.click(origin.x + 560, origin.y + 220);
	await page.getByRole("group", { name: "Display" }).getByRole("button", { name: "Row" }).click();
	await expect(child).toHaveCSS("position", "relative");
	return child;
}

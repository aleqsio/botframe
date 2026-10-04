import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { join } from "node:path";
import { at, dragOn, drawWith, stageOrigin } from "../support";
import type { Drag, Point } from "../support";

const SITE = "https://botframe.test";
const RENDERER = "out/web";
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

export async function centerOf(locator: Locator): Promise<Point> {
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

const INSIDE_THE_FRAME = { x: 560, y: 220 };
export const EMPTY = { x: 900, y: 650 };
const ROW: Drag = { from: { x: 300, y: 60 }, to: { x: 620, y: 240 } };
const FIRST_SHAPE: Drag = { from: { x: 330, y: 100 }, to: { x: 390, y: 140 } };
const SECOND_SHAPE: Drag = { from: { x: 410, y: 100 }, to: { x: 470, y: 140 } };
const THIRD_SHAPE: Drag = { from: { x: 490, y: 100 }, to: { x: 550, y: 140 } };

export async function clickAt(page: Page, origin: Point, point: Point): Promise<void> {
	await page.mouse.click(at(origin, point).x, at(origin, point).y);
}

export async function makeRow(page: Page, origin: Point, lastChild: Locator): Promise<void> {
	await clickAt(page, origin, INSIDE_THE_FRAME);
	await page.getByRole("group", { name: "Display" }).getByRole("button", { name: "Row" }).click();
	await expect(lastChild).toHaveCSS("position", "relative");
}

async function drawShape(page: Page, origin: Point, drag: Drag): Promise<void> {
	await clickAt(page, origin, EMPTY);
	await drawWith(page, origin, "r", drag);
}

export async function drawRowOfThree(page: Page, origin: Point): Promise<Locator> {
	await drawWith(page, origin, "a", ROW);
	await drawShape(page, origin, FIRST_SHAPE);
	await drawShape(page, origin, SECOND_SHAPE);
	await drawShape(page, origin, THIRD_SHAPE);
	await clickAt(page, origin, EMPTY);
	const children = page.locator("#viewport > .layer").nth(1).locator("> .layer");
	await expect(children).toHaveCount(3);
	await makeRow(page, origin, children.nth(2));
	return children;
}

import { expect, test } from "@playwright/test";
import type { JSHandle, Locator, Page } from "@playwright/test";
import { launchApp, stageOrigin } from "./support";

const LAYER = { x: 420, y: 260, width: 240, height: 160 };
const PRESS = { x: 300, y: 60 };
const PAN = { x: 120, y: 80 };
const GRAB = { x: 20, y: 20 };
const LAYER_DRAG = { x: 100, y: 70 };
const ZOOM_STEP = -100;
const VIEWPORT_STYLE = "attributes:style:viewport";

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface PageZoom {
	devicePixelRatio: number;
	visualScale: number | null;
	innerWidth: number;
}

function pageZoom(window: Page): Promise<PageZoom> {
	return window.evaluate(() => ({
		devicePixelRatio: globalThis.devicePixelRatio,
		visualScale: globalThis.visualViewport?.scale ?? null,
		innerWidth: globalThis.innerWidth,
	}));
}

async function boxOf(locator: Locator): Promise<Box> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box on the screen");
	}
	return box;
}

function watchViewport(window: Page): Promise<JSHandle<string[]>> {
	return window.evaluateHandle(() => {
		const viewport = document.querySelector("#viewport");
		const records: string[] = [];
		if (viewport === null) {
			return records;
		}
		const observer = new MutationObserver((list) => {
			for (const record of list) {
				const place = record.target === viewport ? "viewport" : "layer";
				records.push(`${record.type}:${record.attributeName ?? "none"}:${place}`);
			}
		});
		observer.observe(viewport, { attributes: true, childList: true, subtree: true });
		return records;
	});
}

test("the hand tool moves the canvas and leaves the layers alone", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const bar = window.locator(".floating-bar");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);
	expect(await boxOf(layer)).toMatchObject({ x: origin.x + LAYER.x, y: origin.y + LAYER.y });
	const layerStyle = await layer.getAttribute("style");

	await bar.getByLabel("Hand").click();
	await expect(window.locator("#stage")).toHaveAttribute("data-tool", "hand");
	const barBox = await boxOf(bar);

	const records = await watchViewport(window);
	const press = { x: origin.x + PRESS.x, y: origin.y + PRESS.y };
	await window.mouse.move(press.x, press.y);
	await window.mouse.down();
	await window.mouse.move(press.x + PAN.x, press.y + PAN.y, { steps: 12 });
	await window.mouse.up();

	await expect(window.locator("#viewport")).toHaveAttribute("style", /translate\(120px, 80px\)/u, {
		timeout: 2000,
	});
	expect(await boxOf(layer)).toMatchObject({
		x: origin.x + LAYER.x + PAN.x,
		y: origin.y + LAYER.y + PAN.y,
		width: LAYER.width,
		height: LAYER.height,
	});
	expect(await layer.getAttribute("style")).toBe(layerStyle);
	expect(await boxOf(bar)).toEqual(barBox);
	await expect(bar.locator(".tool-button")).toHaveCount(7);

	const written = await records.jsonValue();
	expect(written.length).toBeGreaterThan(0);
	expect([...new Set(written)]).toEqual([VIEWPORT_STYLE]);

	await app.close();
});

test("a wheel with the control key scales the canvas about the pointer", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const bar = window.locator(".floating-bar");

	await expect(layer).toBeVisible();
	await expect(window.locator("#stage")).toHaveAttribute("data-tool", "select");
	const corner = await boxOf(layer);
	const barBox = await boxOf(bar);
	const layerStyle = await layer.getAttribute("style");

	await window.mouse.move(corner.x, corner.y);
	await window.keyboard.down("Control");
	await window.mouse.wheel(0, ZOOM_STEP);
	await window.keyboard.up("Control");

	await expect(window.locator("#viewport")).toHaveAttribute("style", /scale\(1\.6/u, {
		timeout: 2000,
	});

	const box = await boxOf(layer);
	expect(box.x).toBeCloseTo(corner.x, 0);
	expect(box.y).toBeCloseTo(corner.y, 0);
	expect(box.width).toBeGreaterThan(LAYER.width * 1.6);
	expect(await layer.getAttribute("style")).toBe(layerStyle);

	expect(await boxOf(bar)).toEqual(barBox);
	expect(await pageZoom(window)).toEqual({ devicePixelRatio: 1, visualScale: 1, innerWidth: 1200 });

	await app.close();
});

test("a layer drag stays correct after the canvas moves and scales", async () => {
	const { app, window } = await launchApp();
	const layer = window.locator(".layer");
	const bar = window.locator(".floating-bar");

	await expect(layer).toBeVisible();
	const origin = await stageOrigin(window);
	const corner = await boxOf(layer);

	await window.mouse.move(corner.x, corner.y);
	await window.keyboard.down("Control");
	await window.mouse.wheel(0, ZOOM_STEP);
	await window.keyboard.up("Control");
	await expect(window.locator("#viewport")).toHaveAttribute("style", /scale\(1\.6/u, {
		timeout: 2000,
	});

	await bar.getByLabel("Hand").click();
	const press = { x: origin.x + PRESS.x, y: origin.y + PRESS.y };
	await window.mouse.move(press.x, press.y);
	await window.mouse.down();
	await window.mouse.move(press.x + PAN.x, press.y + PAN.y, { steps: 8 });
	await window.mouse.up();
	await expect
		.poll(async () => Math.round((await boxOf(layer)).x), { timeout: 2000 })
		.toBe(Math.round(corner.x + PAN.x));

	const before = await boxOf(layer);
	const style = await layer.getAttribute("style");

	await bar.getByLabel("Select").click();
	await window.mouse.move(before.x + GRAB.x, before.y + GRAB.y);
	await window.mouse.down();
	await window.mouse.move(before.x + GRAB.x + LAYER_DRAG.x, before.y + GRAB.y + LAYER_DRAG.y, {
		steps: 12,
	});
	await window.mouse.up();

	await expect(layer).toHaveAttribute("data-selected", "");
	expect(await layer.getAttribute("style")).not.toBe(style);

	const after = await boxOf(layer);
	expect(after.x).toBeCloseTo(before.x + LAYER_DRAG.x, 0);
	expect(after.y).toBeCloseTo(before.y + LAYER_DRAG.y, 0);
	expect(after.width).toBeCloseTo(before.width, 0);

	await app.close();
});

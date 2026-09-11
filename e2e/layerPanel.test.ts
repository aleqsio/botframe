import { expect, test } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";
import { drawWith, openStage } from "./support";
import type { Drag, Point } from "./support";

const ARTBOARD: Drag = { from: { x: 40, y: 40 }, to: { x: 240, y: 180 } };
const INSIDE: Drag = { from: { x: 80, y: 80 }, to: { x: 180, y: 140 } };
const BRANCH = ["Rectangle", "Artboard 1", "Rectangle 2"];

test("the chevron takes the children of a row away and brings them back", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	await expect(rows).toHaveText(BRANCH);

	const chevron = window.locator("button.layer-chevron");
	await expect(chevron).toHaveCount(1);
	await expect(chevron).toHaveAttribute("aria-expanded", "true");

	await chevron.click();

	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);
	await expect(chevron).toHaveAttribute("aria-expanded", "false");
	await expect(chevron).toHaveAttribute("aria-label", "Expand Artboard 1");

	await chevron.click();

	await expect(rows).toHaveText(BRANCH);
	await app.close();
});

async function rectOf(
	locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the row has no box");
	}
	return box;
}

async function bandOf(line: Locator, part: number): Promise<Point> {
	const box = await rectOf(line);
	return { x: box.x + box.width / 2, y: box.y + box.height * part };
}

async function pressRow(window: Page, line: Locator): Promise<Point> {
	const point = await bandOf(line, 0.5);
	await window.mouse.move(point.x, point.y);
	await window.mouse.down();
	return point;
}

async function moveOnto(window: Page, line: Locator, part: number): Promise<void> {
	const point = await bandOf(line, part);
	await window.mouse.move(point.x, point.y, { steps: 8 });
}

test("a drag into the middle of a row gives the layer that row as its parent", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");
	const lines = window.locator(".layer-line");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);
	await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");

	await pressRow(window, lines.nth(0));
	await moveOnto(window, lines.nth(1), 0.5);

	await expect(lines.nth(0)).toHaveAttribute("data-mark", "dragged");
	await expect(lines.nth(1)).toHaveAttribute("data-mark", "inside");

	await window.mouse.up();

	await expect(rows).toHaveText(["Artboard 1", "Rectangle"]);
	await expect(window.locator("#viewport > .layer")).toHaveCount(1);
	expect((await rectOf(rows.nth(1))).x - (await rectOf(rows.nth(0))).x).toBe(14);
	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(lines.nth(0)).not.toHaveAttribute("data-mark", /.*/u);

	await app.close();
});

test("a drag to the bottom edge of a row puts the layer after that row", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");
	const lines = window.locator(".layer-line");

	await drawWith(window, origin, "a", ARTBOARD);

	await pressRow(window, lines.nth(0));
	await moveOnto(window, lines.nth(1), 0.9);

	await expect(lines.nth(1)).toHaveAttribute("data-mark", "after");

	await window.mouse.up();

	await expect(rows).toHaveText(["Artboard 1", "Rectangle"]);
	await expect(window.locator("#viewport > .layer")).toHaveCount(2);
	expect((await rectOf(rows.nth(1))).x).toBe((await rectOf(rows.nth(0))).x);

	await app.close();
});

test("a press with a small move selects the row and moves no layer", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");
	const lines = window.locator(".layer-line");

	await drawWith(window, origin, "a", ARTBOARD);

	const point = await pressRow(window, lines.nth(0));
	await window.mouse.move(point.x + 2, point.y + 1);
	await window.mouse.up();

	await expect(rows.nth(0)).toHaveAttribute("aria-pressed", "true");
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);
	await expect(window.locator("#viewport > .layer")).toHaveCount(2);

	await app.close();
});

function smallDrag(step: number): Drag {
	const top = 40 + step * 44;
	return { from: { x: 60, y: top }, to: { x: 140, y: top + 14 } };
}

async function drawSteps(window: Page, origin: Point, left: number): Promise<void> {
	if (left === 0) {
		return;
	}
	await drawWith(window, origin, "r", smallDrag(left));
	await drawSteps(window, origin, left - 1);
}

async function shrink(app: ElectronApplication, height: number): Promise<void> {
	await app.evaluate(
		({ BrowserWindow }, size) => {
			BrowserWindow.getAllWindows()[0]?.setSize(size.width, size.height);
		},
		{ width: 1200, height },
	);
}

test("a drag near the bottom edge scrolls a list that is longer than the panel", async () => {
	const { app, origin, window } = await openStage();
	const lines = window.locator(".layer-line");
	const panel = window.locator("#layers");

	await drawSteps(window, origin, 9);
	await expect(lines).toHaveCount(10);
	await shrink(app, 240);

	const room = await panel.evaluate((element) => element.scrollHeight - element.clientHeight);
	expect(room).toBeGreaterThan(20);
	expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);

	await pressRow(window, lines.nth(0));
	const box = await rectOf(panel);
	await window.mouse.move(box.x + box.width / 2, box.y + box.height - 4, { steps: 8 });

	await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(room);

	await window.mouse.up();
	await app.close();
});

test("a collapsed row takes a drop as its last child", async () => {
	const { app, origin, window } = await openStage();
	const rows = window.locator(".layer-row");
	const lines = window.locator(".layer-line");
	const chevron = window.locator("button.layer-chevron");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	await chevron.click();
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);

	await pressRow(window, lines.nth(0));
	await moveOnto(window, lines.nth(1), 0.5);
	await expect(lines.nth(1)).toHaveAttribute("data-mark", "inside");
	await window.mouse.up();

	await expect(rows).toHaveText(["Artboard 1"]);

	await chevron.click();

	await expect(rows).toHaveText(["Artboard 1", "Rectangle 2", "Rectangle"]);

	await app.close();
});

test("a nest by drag holds the place of the layer on the canvas", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");
	const lines = window.locator(".layer-line");

	await drawWith(window, origin, "a", ARTBOARD);
	await expect(rows).toHaveText(["Rectangle", "Artboard 1"]);
	const seed = layers.nth(0);
	const seedId = await seed.getAttribute("data-layer-id");
	const before = await seed.boundingBox();
	if (before === null) {
		throw new Error("the layer has no box");
	}

	await pressRow(window, lines.nth(0));
	await moveOnto(window, lines.nth(1), 0.5);
	await window.mouse.up();

	const child = window.locator(`.layer[data-layer-id="${seedId ?? ""}"]`);
	await expect(child).toHaveCount(1);
	await expect(rows).toHaveText(["Artboard 1", "Rectangle"]);
	const after = await child.boundingBox();
	if (after === null) {
		throw new Error("the child has no box");
	}
	expect(Math.round(after.x)).toBe(Math.round(before.x));
	expect(Math.round(after.y)).toBe(Math.round(before.y));

	await app.close();
});

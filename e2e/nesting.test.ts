import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { at, boxOf, dragOn, drawWith, openStage, pressInto } from "./support";
import type { Drag, Point } from "./support";

const ARTBOARD: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const INSIDE: Drag = { from: { x: 320, y: 80 }, to: { x: 420, y: 140 } };
const OVER_THE_EDGE: Drag = { from: { x: 420, y: 120 }, to: { x: 540, y: 240 } };
const MOVE_ARTBOARD: Drag = { from: { x: 460, y: 60 }, to: { x: 510, y: 110 } };
const OUTSIDE_THE_CLIP = { x: 510, y: 210 };
const CLIPPED_DRAG: Drag = { from: OUTSIDE_THE_CLIP, to: { x: 540, y: 230 } };
const SELECTION_BLUE = "rgb(13, 153, 255)";
const OVER_THE_ARTBOARD = { x: 440, y: 150 };
const INTO_THE_ARTBOARD: Drag = { from: { x: 540, y: 340 }, to: OVER_THE_ARTBOARD };
const BEYOND_THE_CLIP = { x: 520, y: 150 };
const CARRIED = { x: -100, y: -190 };
const OVER_THE_SHAPE: Drag = { from: { x: 460, y: 300 }, to: { x: 560, y: 360 } };
const NESTED: Drag = { from: { x: 300, y: 60 }, to: { x: 460, y: 160 } };
const GRAB_THE_SHAPE = { x: 540, y: 340 };
const OVER_THE_ROOT_ARTBOARD = { x: 470, y: 170 };
const OVER_THE_NESTED_ARTBOARD = { x: 440, y: 150 };

async function idOf(locator: Locator): Promise<string> {
	const id = await locator.getAttribute("data-layer-id");
	if (id === null) {
		throw new Error("the layer has no id");
	}
	return id;
}

function layerById(window: Page, id: string): Locator {
	return window.locator(`.layer[data-layer-id="${id}"]`);
}

function layerIdAt(window: Page, point: Point): Promise<string | null> {
	return window.evaluate(
		(spot: Point) =>
			document.elementFromPoint(spot.x, spot.y)?.closest<HTMLElement>(".layer")?.dataset[
				"layerId"
			] ?? null,
		point,
	);
}

test("a draw inside an artboard puts the new layer in the artboard", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);

	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	await expect(child).toHaveCount(1);
	await expect(child).toHaveAttribute("style", /translate3d\(40px, 40px, 0px\)/u);
	await expect(child).toHaveCSS("width", "100px");
	await expect(child).toHaveCSS("height", "60px");
	expect(await boxOf(child)).toEqual(at(origin, INSIDE.from));
	expect(await boxOf(window.locator(".selection"))).toEqual(at(origin, INSIDE.from));

	await expect(rows).toHaveText(["Rectangle", "Artboard 1", "Rectangle 2"]);
	expect((await boxOf(rows.nth(2))).x - (await boxOf(rows.nth(1))).x).toBe(14);

	await rows.nth(1).click();
	await expect(artboard).toHaveAttribute("data-selected", "");
	await expect(child).not.toHaveAttribute("data-selected", "");

	await app.close();
});

test("a child of an artboard moves with the artboard", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	const before = await boxOf(child);

	await dragOn(window, origin, MOVE_ARTBOARD);

	await expect(artboard).toHaveAttribute("style", /translate3d\(330px, 90px, 0px\)/u);
	await expect(child).toHaveAttribute("style", /translate3d\(40px, 40px, 0px\)/u);
	expect(await boxOf(child)).toEqual({ x: before.x + 50, y: before.y + 50 });

	await app.close();
});

test("an artboard clips the part of a child outside its box", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", OVER_THE_EDGE);
	const artboard = layers.nth(1);
	const child = artboard.locator("> .layer");
	await expect(artboard).toHaveCSS("overflow", "hidden");
	await expect(child).toHaveCSS("width", "120px");

	await window.mouse.click(at(origin, OUTSIDE_THE_CLIP).x, at(origin, OUTSIDE_THE_CLIP).y);
	await expect(child).toHaveAttribute("data-selected", "");

	await window.mouse.click(at(origin, OVER_THE_ARTBOARD).x, at(origin, OVER_THE_ARTBOARD).y);
	await expect(child).toHaveAttribute("data-selected", "");

	await app.close();
});

test("a drag from outside the artboard takes the clipped child to the root", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", OVER_THE_EDGE);
	const child = layers.nth(2);
	await window.mouse.click(at(origin, OUTSIDE_THE_CLIP).x, at(origin, OUTSIDE_THE_CLIP).y);
	await expect(child).toHaveAttribute("data-selected", "");
	const before = await boxOf(child);

	await dragOn(window, origin, CLIPPED_DRAG);

	await expect(layers.nth(1).locator("> .layer")).toHaveCount(0);
	await expect(window.locator("#viewport > .layer")).toHaveCount(3);
	expect(await boxOf(child)).toEqual({ x: before.x + 30, y: before.y + 20 });
	await expect(child).toHaveAttribute("data-selected", "");

	await app.close();
});

test("the selection border draws outside the clip of the artboard", async () => {
	const { app, layers, origin, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", OVER_THE_EDGE);
	const child = layers.nth(1).locator("> .layer");
	const selection = window.locator(".selection");

	await expect(child).toHaveAttribute("data-selected", "");
	await expect(child).toHaveCSS("outline-style", "none");
	await expect(selection).toHaveCSS("outline-style", "solid");
	await expect(selection).toHaveCSS("outline-color", SELECTION_BLUE);

	await app.close();
});

test("a drag into a clipped artboard gives the layer the new parent during the drag", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	const artboard = layerById(window, await idOf(layers.nth(1)));
	const dragged = await idOf(layers.nth(0));
	const before = await boxOf(layerById(window, dragged));

	await pressInto(window, origin, INTO_THE_ARTBOARD);

	const child = artboard.locator("> .layer");
	await expect(child).toHaveCount(1);
	await expect(stage).toHaveAttribute("data-drop", "");
	await expect(stage).toHaveCSS("cursor", "copy");
	await expect(child).toHaveCSS("cursor", "copy");
	await expect.poll(() => layerIdAt(window, at(origin, OVER_THE_ARTBOARD))).toBe(dragged);
	await expect.poll(() => layerIdAt(window, at(origin, BEYOND_THE_CLIP))).toBeNull();

	await window.mouse.up();

	await expect(child).toHaveCount(1);
	await expect(child).toHaveAttribute("style", /translate3d\(40px, 30px, 0px\)/u);
	await expect(stage).not.toHaveAttribute("data-drop", "");
	expect(await boxOf(child)).toEqual({ x: before.x + CARRIED.x, y: before.y + CARRIED.y });

	await app.close();
});

test("Escape during a move drag puts the layer back in the first parent", async () => {
	const { app, layers, origin, stage, window } = await openStage();

	await drawWith(window, origin, "a", ARTBOARD);
	const artboard = layerById(window, await idOf(layers.nth(1)));
	const layer = layerById(window, await idOf(layers.nth(0)));
	const before = await boxOf(layer);

	await pressInto(window, origin, INTO_THE_ARTBOARD);
	await expect(artboard.locator("> .layer")).toHaveCount(1);

	await window.keyboard.press("Escape");

	await expect(artboard.locator("> .layer")).toHaveCount(0);
	await expect(stage).not.toHaveAttribute("data-drop", "");
	await expect(layer).toHaveAttribute("style", /translate3d\(420px, 260px, 0px\)/u);

	await window.mouse.up();

	await expect(layers).toHaveCount(2);
	expect(await boxOf(layer)).toEqual(before);

	await app.close();
});

test("a draw over a shape puts the new layer at the root, not in the shape", async () => {
	const { app, layers, origin, window } = await openStage();
	const rows = window.locator(".layer-row");

	await drawWith(window, origin, "r", OVER_THE_SHAPE);

	await expect(rows).toHaveText(["Rectangle", "Rectangle 2"]);
	await expect(window.locator("#viewport > .layer")).toHaveCount(2);
	await expect(layers.nth(1)).toHaveAttribute("style", /translate3d\(460px, 300px, 0px\)/u);
	expect((await boxOf(rows.nth(1))).x).toBe((await boxOf(rows.nth(0))).x);

	await app.close();
});

test("the drop target takes a highlight, and a root artboard takes none", async () => {
	const { app, layers, origin, window } = await openStage();
	const frame = window.locator(".drop-frame");

	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "a", NESTED);
	const nested = layerById(window, await idOf(layers.nth(1).locator("> .layer")));
	await expect(nested).toHaveCount(1);

	await window.mouse.move(at(origin, GRAB_THE_SHAPE).x, at(origin, GRAB_THE_SHAPE).y);
	await window.mouse.down();

	await window.mouse.move(
		at(origin, OVER_THE_ROOT_ARTBOARD).x,
		at(origin, OVER_THE_ROOT_ARTBOARD).y,
		{ steps: 8 },
	);
	await expect(frame).toHaveCount(0);

	await window.mouse.move(
		at(origin, OVER_THE_NESTED_ARTBOARD).x,
		at(origin, OVER_THE_NESTED_ARTBOARD).y,
		{ steps: 8 },
	);
	await expect(frame).toHaveCount(1);
	await expect(frame).toHaveCSS("outline-color", SELECTION_BLUE);
	expect(await boxOf(frame)).toEqual(at(origin, NESTED.from));

	await window.mouse.up();

	await expect(frame).toHaveCount(0);
	await expect(nested.locator("> .layer")).toHaveCount(1);

	await app.close();
});

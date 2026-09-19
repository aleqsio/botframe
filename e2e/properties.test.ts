import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { drawWith, openStage } from "./support";
import type { Drag } from "./support";

const PRESET = { name: "iPhone 16", width: 393, height: 852 };
const ARTBOARD: Drag = { from: { x: 280, y: 40 }, to: { x: 480, y: 180 } };
const INSIDE: Drag = { from: { x: 320, y: 80 }, to: { x: 420, y: 140 } };
const SHIFT_DRAG = 2;
const DRAG = 40;
const UNDO = process.platform === "darwin" ? "Meta+z" : "Control+z";

async function placePreset(window: Page, name: string): Promise<void> {
	await window.keyboard.press("a");
	await window
		.getByRole("toolbar", { name: "Artboard options" })
		.getByRole("button", { name })
		.click();
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box");
	}
	return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}

async function typeInto(window: Page, label: string, text: string): Promise<void> {
	const field = window.getByLabel(label, { exact: true });
	await field.fill(text);
	await field.press("Enter");
}

function chipHandle(window: Page, label: string): Locator {
	return window.getByLabel(label, { exact: true });
}

function chipValue(window: Page, label: string): Locator {
	return window.getByLabel(`${label} value`, { exact: true });
}

async function pickUnit(window: Page, label: string, unit: string): Promise<void> {
	await window.getByLabel(`${label} unit`, { exact: true }).click();
	await window.getByRole("option", { name: unit, exact: true }).click();
}

async function dragBy(window: Page, handle: Locator, pixels: number): Promise<void> {
	const start = await centerOf(handle);
	await window.mouse.move(start.x, start.y);
	await window.mouse.down();
	await window.mouse.move(start.x + pixels, start.y, { steps: 8 });
	await window.mouse.up();
}

test("a preset places an artboard of that size at the middle of the stage", async () => {
	const { app, layers, stage, window } = await openStage();
	const title = window.locator("#inspector .inspector-name");
	await expect(title).toHaveText("Page");

	await placePreset(window, PRESET.name);

	const drawn = layers.nth(1);
	await expect(layers).toHaveCount(2);
	await expect(drawn).toHaveCSS("width", `${PRESET.width}px`);
	await expect(drawn).toHaveCSS("height", `${PRESET.height}px`);
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 255, 255)");
	await expect(drawn).toHaveAttribute("data-selected", "");
	await expect(stage).toHaveAttribute("data-tool", "select");
	await expect(title).toHaveText(PRESET.name);
	expect(await centerOf(drawn)).toEqual(await centerOf(stage));

	await app.close();
});

test("the orientation control exchanges the width and the height", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const preset = window.getByLabel("Preset", { exact: true });
	await expect(preset).toHaveValue(PRESET.name);

	await window.getByRole("button", { name: "Landscape" }).click();

	await expect(drawn).toHaveCSS("width", `${PRESET.height}px`);
	await expect(drawn).toHaveCSS("height", `${PRESET.width}px`);
	await expect(preset).toHaveValue("Custom");

	await app.close();
});

test("the preset list of a selected artboard resizes it", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await window.getByLabel("Preset", { exact: true }).selectOption("A4");

	await expect(drawn).toHaveCSS("width", "595px");
	await expect(drawn).toHaveCSS("height", "842px");

	await app.close();
});

test("the clip switch changes what the artboard does with the content outside its box", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const clip = window.getByLabel("Clip content", { exact: true });

	await expect(clip).toBeChecked();
	await expect(drawn).toHaveCSS("overflow", "hidden");

	await clip.uncheck();

	await expect(drawn).toHaveCSS("overflow", "visible");

	await app.close();
});

test("a name that a person types letter by letter does not change the tool", async () => {
	const { app, stage, window } = await openStage();
	await placePreset(window, PRESET.name);
	const name = window.getByLabel("Name", { exact: true });

	await name.fill("");
	await name.pressSequentially("Cover art");
	await name.press("Enter");

	await expect(stage).toHaveAttribute("data-tool", "select");
	await expect(window.locator(".layer-row").nth(1)).toHaveText("Cover art");
	await expect(window.locator("#inspector .inspector-name")).toHaveText("Cover art");

	await app.close();
});

test("the fill swatch opens a picker that paints the layer", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const fill = window.getByLabel("Fill", { exact: true });

	await window.getByLabel("Fill picker", { exact: true }).click();
	const area = window.getByLabel(/^Saturation and brightness/u);
	await expect(area).toBeVisible();

	await window.getByLabel("#0d99ff", { exact: true }).click();

	await expect(drawn).toHaveCSS("background-color", "rgb(13, 153, 255)");
	await expect(fill).toHaveValue("#0d99ff");

	await window.getByLabel("Opacity", { exact: true }).fill("50");

	await expect(fill).toHaveValue("#0d99ff80");
	await expect(drawn).toHaveCSS("background-color", "rgba(13, 153, 255, 0.5)");

	await area.focus();
	await window.keyboard.press("ArrowLeft");

	await expect(fill).not.toHaveValue("#0d99ff80");

	await app.close();
});

test("the picker holds the angle of a color that shows no angle", async () => {
	const { app, window } = await openStage();
	await placePreset(window, PRESET.name);
	const fill = window.getByLabel("Fill", { exact: true });
	await expect(fill).toHaveValue("#ffffff");

	await window.getByLabel("Fill picker", { exact: true }).click();
	await window.getByLabel("Hue", { exact: true }).fill("120");
	await window.getByLabel(/^Saturation and brightness/u).press("ArrowRight");

	await expect(fill).toHaveValue("#fcfffc");

	await app.close();
});

test("the fill field reads a color that a person names and writes it as hex", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await typeInto(window, "Fill", "rebeccapurple");

	await expect(drawn).toHaveCSS("background-color", "rgb(102, 51, 153)");
	await expect(window.getByLabel("Fill", { exact: true })).toHaveValue("#663399");

	await typeInto(window, "Fill", "inherit");

	await expect(drawn).toHaveCSS("background-color", "rgb(102, 51, 153)");
	await expect(window.getByLabel("Fill", { exact: true })).toHaveValue("#663399");

	await app.close();
});

test("the panel keeps a fill and a width that the stage can paint", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await typeInto(window, "Fill", "notacolor");
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 255, 255)");

	await typeInto(window, "Fill", "#ff0000");
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 0, 0)");

	await typeInto(window, "W value", "-50");
	await expect(drawn).toHaveCSS("width", "1px");

	await app.close();
});

test("the box fields move and resize the layer", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await typeInto(window, "X value", "40");
	await typeInto(window, "H value", "120");

	await expect(drawn).toHaveAttribute("style", /translate3d\(40px, /u);
	await expect(drawn).toHaveCSS("height", "120px");

	await app.close();
});

test("a drag of the width handle resizes the layer, and one undo returns the first width", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await dragBy(window, chipHandle(window, "W"), DRAG);

	await expect(drawn).toHaveCSS("width", `${PRESET.width + DRAG}px`);
	await expect(chipValue(window, "W")).toHaveValue(String(PRESET.width + DRAG));
	expect(await window.evaluate(() => String(globalThis.getSelection()))).toBe("");

	await window.keyboard.press(UNDO);

	await expect(drawn).toHaveCSS("width", `${PRESET.width}px`);

	await app.close();
});

test("the keyboard reaches the handle and the value of a chip", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const handle = chipHandle(window, "X");
	const value = chipValue(window, "X");

	await handle.focus();
	await expect(handle).toBeFocused();

	const before = Number(await value.inputValue());
	await window.keyboard.press("ArrowRight");
	await expect(value).toHaveValue(String(before + 1));

	await window.keyboard.press("Tab");
	await expect(value).toBeFocused();
	await value.fill("40");
	await window.keyboard.press("Enter");

	await expect(drawn).toHaveAttribute("style", /translate3d\(40px, /u);

	await app.close();
});

test("shift makes a large drag step and alt makes a small one", async () => {
	const { app, window } = await openStage();
	await placePreset(window, PRESET.name);

	await window.keyboard.down("Shift");
	await dragBy(window, chipHandle(window, "W"), 2);
	await window.keyboard.up("Shift");
	await expect(chipValue(window, "W")).toHaveValue(String(PRESET.width + 20));

	await window.keyboard.down("Alt");
	await dragBy(window, chipHandle(window, "W"), 10);
	await window.keyboard.up("Alt");
	await expect(chipValue(window, "W")).toHaveValue(String(PRESET.width + 21));

	await app.close();
});

test("a layer inside a container takes a unit that is not the pixel", async () => {
	const { app, layers, origin, window } = await openStage();
	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	const child = layers.nth(1).locator("> .layer");
	const unit = window.getByLabel("W unit", { exact: true });

	await expect(unit).toHaveText("px");
	await expect(chipValue(window, "W")).toHaveValue("100");

	await pickUnit(window, "W", "%");

	await expect(chipValue(window, "W")).toHaveValue("50");
	await expect(child).toHaveCSS("width", "100px");

	await typeInto(window, "W value", "25%");

	await expect(unit).toHaveText("%");
	await expect(child).toHaveCSS("width", "50px");

	await app.close();
});

test("shift steps a percentage by five, and the layer follows the artboard", async () => {
	const { app, layers, origin, window } = await openStage();
	await drawWith(window, origin, "a", ARTBOARD);
	await drawWith(window, origin, "r", INSIDE);
	const child = layers.nth(1).locator("> .layer");
	await pickUnit(window, "W", "%");

	await window.keyboard.down("Shift");
	await dragBy(window, chipHandle(window, "W"), SHIFT_DRAG);
	await window.keyboard.up("Shift");

	await expect(chipValue(window, "W")).toHaveValue("60");
	await expect(child).toHaveCSS("width", "120px");

	await window.locator(".layer-row").nth(1).click();
	await typeInto(window, "W value", "400");

	await expect(child).toHaveCSS("width", "240px");

	await app.close();
});

test("a layer at the root shows each unit and refuses the units that need a container", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const unit = window.getByLabel("W unit", { exact: true });
	const menu = window.getByRole("listbox");
	const percent = menu.getByRole("option", { name: "%", exact: true });

	await expect(unit).toHaveText("px");
	await unit.click();

	await expect(menu.getByRole("option")).toHaveText(["px", "rem", "%", "vw", "vh"]);
	await expect(menu.getByRole("option", { name: "px", exact: true })).toBeEnabled();
	await expect(menu.getByRole("option", { name: "rem", exact: true })).toBeEnabled();
	await expect(percent).toBeDisabled();

	await window.keyboard.press("ArrowDown");
	await window.keyboard.press("ArrowDown");
	await expect(percent).toHaveAttribute("data-highlighted", "");
	await window.keyboard.press("Enter");
	await percent.click({ force: true });

	await expect(percent).toBeVisible();
	await window.keyboard.press("Escape");
	await expect(unit).toHaveText("px");
	await expect(chipValue(window, "W")).toHaveValue(String(PRESET.width));
	await expect(drawn).toHaveCSS("width", `${PRESET.width}px`);

	await app.close();
});

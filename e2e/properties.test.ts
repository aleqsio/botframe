import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { openStage } from "./support";

const PRESET = { name: "iPhone 16", width: 393, height: 852 };

async function placePreset(window: Page, name: string): Promise<void> {
	await window.keyboard.press("a");
	await window.getByRole("button", { name }).click();
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	if (box === null) {
		throw new Error("the element has no box");
	}
	return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}

test("a preset places an artboard of that size at the middle of the stage", async () => {
	const { app, layers, stage, window } = await openStage();
	const title = window.locator("#properties .panel-title");
	await expect(title).toHaveText("Select");

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

test("the orientation button exchanges the width and the height", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);
	const preset = window.getByLabel("Preset", { exact: true });
	await expect(preset).toHaveValue(PRESET.name);

	await window.getByRole("button", { name: "Swap the orientation" }).click();

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
	await expect(window.locator("#properties .panel-title")).toHaveText("Cover art");

	await app.close();
});

async function typeInto(window: Page, label: string, text: string): Promise<void> {
	const field = window.getByLabel(label, { exact: true });
	await field.fill(text);
	await field.press("Enter");
}

test("the panel keeps a fill and a width that the stage can paint", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await typeInto(window, "Fill", "notacolor");
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 255, 255)");

	await typeInto(window, "Fill", "#ff0000");
	await expect(drawn).toHaveCSS("background-color", "rgb(255, 0, 0)");

	await typeInto(window, "W", "-50");
	await expect(drawn).toHaveCSS("width", "1px");

	await app.close();
});

test("the box fields move and resize the layer", async () => {
	const { app, layers, window } = await openStage();
	await placePreset(window, PRESET.name);
	const drawn = layers.nth(1);

	await typeInto(window, "X", "40");
	await typeInto(window, "H", "120");

	await expect(drawn).toHaveAttribute("style", /translate3d\(40px, /u);
	await expect(drawn).toHaveCSS("height", "120px");

	await app.close();
});

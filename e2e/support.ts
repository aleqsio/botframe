import { _electron as electron, expect } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";

export async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
	const app = await electron.launch({ args: ["out/main/index.js"] });
	const window = await app.firstWindow();
	return { app, window };
}

export function stageOrigin(window: Page): Promise<{ x: number; y: number }> {
	return window.locator("#stage").evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.left, y: box.top };
	});
}

export function at(
	origin: { x: number; y: number },
	point: { x: number; y: number },
): { x: number; y: number } {
	return { x: origin.x + point.x, y: origin.y + point.y };
}

export async function openStage(): Promise<{
	app: ElectronApplication;
	layers: Locator;
	origin: { x: number; y: number };
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

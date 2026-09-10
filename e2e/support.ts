import { _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";

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

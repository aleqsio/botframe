import type { ExportScene } from "../../shared/exportFile";
import { bridge } from "../bridge";
import { painted, targetOf, withTarget } from "./drawScene";
import type { SceneView } from "./drawScene";

export function printScene(view: SceneView, scene: ExportScene): Promise<Uint8Array> {
	const target = targetOf(view, scene);
	const { bounds } = target;
	return withTarget(target, async () => {
		view.camera.set({ x: -bounds.x, y: -bounds.y, zoom: 1 });
		await painted();
		const size = {
			width: Math.max(1, Math.ceil(bounds.width)),
			height: Math.max(1, Math.ceil(bounds.height)),
		};
		const bytes = await bridge().printPage(size);
		if (bytes === null) {
			throw new Error("botframe did not print the page.");
		}
		return bytes;
	});
}

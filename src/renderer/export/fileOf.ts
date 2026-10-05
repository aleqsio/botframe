import type { DesignDocument } from "../../document/document";
import { isLayerId } from "../../document/path";
import type { ExportScene } from "../../shared/exportFile";
import { inBrowser } from "../bridge";
import { drawScene, targetOf } from "./drawScene";
import type { SceneView } from "./drawScene";
import { layerMarkup } from "./markup";
import { htmlFile, svgFile, zipFile } from "./markupFiles";
import { browserPdf, browserPicture } from "./pictureScene";
import { printScene } from "./printScene";

function titleOf(doc: DesignDocument, target: string | null): string {
	const layer = target !== null && isLayerId(target) ? doc.layer(target) : null;
	return layer === null || layer.name === "" ? "botframe" : layer.name;
}

export function fileOf(
	doc: DesignDocument,
	view: SceneView,
	scene: ExportScene,
): Promise<Uint8Array> {
	const browser = inBrowser();
	if (scene.format === "png" || scene.format === "jpg") {
		return browser ? browserPicture(doc, view, scene) : drawScene(view, scene);
	}
	if (scene.format === "pdf") {
		return browser ? browserPdf(doc, view, scene) : printScene(view, scene);
	}
	const markup = layerMarkup(doc, targetOf(view, scene).element);
	const title = titleOf(doc, scene.target);
	if (scene.format === "svg") {
		return Promise.resolve(svgFile(markup));
	}
	return Promise.resolve(scene.format === "zip" ? zipFile(markup, title) : htmlFile(markup, title));
}

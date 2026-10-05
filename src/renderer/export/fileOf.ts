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

type Paint = (doc: DesignDocument, view: SceneView, scene: ExportScene) => Promise<Uint8Array>;

interface Painter {
	picture: Paint;
	pdf: Paint;
}

const DESKTOP: Painter = {
	picture: (_doc, view, scene) => drawScene(view, scene),
	pdf: (_doc, view, scene) => printScene(view, scene),
};

const BROWSER: Painter = { picture: browserPicture, pdf: browserPdf };

function titleOf(doc: DesignDocument, target: string | null): string {
	const layer = target !== null && isLayerId(target) ? doc.layer(target) : null;
	return layer === null || layer.name === "" ? "botframe" : layer.name;
}

export function fileOf(
	doc: DesignDocument,
	view: SceneView,
	scene: ExportScene,
): Promise<Uint8Array> {
	const painter = inBrowser() ? BROWSER : DESKTOP;
	if (scene.format === "png" || scene.format === "jpg") {
		return painter.picture(doc, view, scene);
	}
	if (scene.format === "pdf") {
		return painter.pdf(doc, view, scene);
	}
	const markup = layerMarkup(doc, targetOf(view, scene).element);
	const title = titleOf(doc, scene.target);
	if (scene.format === "svg") {
		return Promise.resolve(svgFile(markup));
	}
	return Promise.resolve(scene.format === "zip" ? zipFile(markup, title) : htmlFile(markup, title));
}

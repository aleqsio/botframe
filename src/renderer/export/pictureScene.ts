import type { DesignDocument } from "../../document/document";
import type { Rect } from "../../document/layer";
import type { ExportScene } from "../../shared/exportFile";
import { base64Of } from "./base64";
import { blankCanvas, encoded, layerBounds, pictureType, readable, targetOf } from "./drawScene";
import type { SceneView } from "./drawScene";
import { layerMarkup } from "./markup";
import { svgFile } from "./markupFiles";
import { pdfOfPixels } from "./pdf";
import { fittedScale } from "./plan";

interface Picture {
	context: OffscreenCanvasRenderingContext2D;
	bounds: Rect;
}

const PDF_SCALE = 2;
const POINTS_PER_PIXEL = 0.75;

async function svgImage(svg: Uint8Array): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = `data:image/svg+xml;base64,${base64Of(svg)}`;
	await image.decode();
	return image;
}

async function pictureOf(
	doc: DesignDocument,
	view: SceneView,
	scene: ExportScene,
	type: string,
): Promise<Picture> {
	const { element, bounds } = targetOf(view, scene);
	const drawn = layerBounds(view, element);
	const image = await svgImage(svgFile(layerMarkup(doc, element)));
	const scale = fittedScale(bounds, scene.scale, scene.longSide);
	const width = Math.max(1, Math.round(bounds.width * scale));
	const height = Math.max(1, Math.round(bounds.height * scale));
	const context = blankCanvas(width, height, type);
	const source = { x: bounds.x - drawn.x, y: bounds.y - drawn.y };
	context.drawImage(image, source.x, source.y, bounds.width, bounds.height, 0, 0, width, height);
	return { context, bounds };
}

export async function browserPicture(
	doc: DesignDocument,
	view: SceneView,
	scene: ExportScene,
): Promise<Uint8Array> {
	const type = pictureType(scene);
	const { context } = await pictureOf(doc, view, scene, type);
	return encoded(context.canvas, type);
}

export async function browserPdf(
	doc: DesignDocument,
	view: SceneView,
	scene: ExportScene,
): Promise<Uint8Array> {
	const picture = { ...scene, scale: PDF_SCALE };
	const { context, bounds } = await pictureOf(doc, view, picture, "image/png");
	const { width, height } = context.canvas;
	const pixels = await readable(() => context.getImageData(0, 0, width, height));
	const page = { width: bounds.width * POINTS_PER_PIXEL, height: bounds.height * POINTS_PER_PIXEL };
	return pdfOfPixels(pixels, page);
}

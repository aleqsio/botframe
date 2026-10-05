import type { Rect } from "../../document/layer";
import { IMAGE_TYPE } from "../../shared/exportImage";
import type { ExportScene } from "../../shared/exportImage";
import { bridge } from "../bridge";
import { toCanvasPoint } from "../state/camera";
import type { Camera } from "../state/camera";
import type { Slot } from "../state/slot";
import { fittedScale, planExport } from "./plan";
import type { ExportPlan, Tile } from "./plan";

export interface SceneView {
	stage: HTMLElement;
	camera: Slot<Camera>;
}

function elementOf(stage: HTMLElement, target: string | null): HTMLElement {
	const selector =
		target === null ? "#viewport" : `#viewport .layer[data-layer-id="${CSS.escape(target)}"]`;
	const element = stage.querySelector<HTMLElement>(selector);
	if (element === null) {
		throw new Error("The layer is not on the canvas.");
	}
	return element;
}

function unionOf(boxes: readonly DOMRect[]): DOMRect {
	const left = Math.min(...boxes.map((box) => box.left));
	const top = Math.min(...boxes.map((box) => box.top));
	const right = Math.max(...boxes.map((box) => box.right));
	const bottom = Math.max(...boxes.map((box) => box.bottom));
	return new DOMRect(left, top, right - left, bottom - top);
}

function paintedBox(element: HTMLElement): DOMRect {
	const own = element.getBoundingClientRect();
	if (getComputedStyle(element).overflow !== "visible") {
		return own;
	}
	const children = element.querySelectorAll(".layer");
	return unionOf([own, ...Array.from(children, (child) => child.getBoundingClientRect())]);
}

function layerBounds(view: SceneView, element: HTMLElement): Rect {
	const camera = view.camera.get();
	const stage = view.stage.getBoundingClientRect();
	const box = paintedBox(element);
	const at = toCanvasPoint(camera, { x: box.left - stage.left, y: box.top - stage.top });
	return { ...at, width: box.width / camera.zoom, height: box.height / camera.zoom };
}

export function painted(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});
}

async function captureTile(view: SceneView, tile: Tile): Promise<ImageBitmap> {
	view.camera.set(tile.camera);
	await painted();
	const bytes = await bridge().capturePage(tile.source);
	if (bytes === null) {
		throw new Error("botframe did not capture the picture.");
	}
	return createImageBitmap(new Blob([bytes.slice()], { type: IMAGE_TYPE }));
}

async function drawTiles(view: SceneView, plan: ExportPlan): Promise<Uint8Array> {
	const canvas = new OffscreenCanvas(plan.width, plan.height);
	const context = canvas.getContext("2d");
	if (context === null) {
		throw new Error("botframe cannot draw the picture.");
	}
	const drawTile = async (tile: Tile): Promise<void> => {
		const bitmap = await captureTile(view, tile);
		context.drawImage(bitmap, tile.at.x, tile.at.y);
		bitmap.close();
	};
	await plan.tiles.reduce(
		(drawn: Promise<void>, tile) => drawn.then(() => drawTile(tile)),
		Promise.resolve(),
	);
	const blob = await canvas.convertToBlob({ type: IMAGE_TYPE });
	return new Uint8Array(await blob.arrayBuffer());
}

export async function drawScene(view: SceneView, scene: ExportScene): Promise<Uint8Array> {
	const element = elementOf(view.stage, scene.target);
	const bounds = scene.area ?? layerBounds(view, element);
	const screen = {
		width: view.stage.clientWidth,
		height: view.stage.clientHeight,
		ratio: window.devicePixelRatio,
	};
	element.dataset["exportTarget"] = "";
	try {
		const scale = fittedScale(bounds, scene.scale, scene.longSide);
		return await drawTiles(view, planExport(bounds, scale, screen));
	} finally {
		delete element.dataset["exportTarget"];
	}
}

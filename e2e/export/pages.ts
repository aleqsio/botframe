import type * as Pdfjs from "pdfjs-dist";

export interface Pixels {
	width: number;
	height: number;
	base64: string;
}

export interface PdfRequest {
	library: string;
	worker: string;
	base64: string;
	width: number;
}

export async function decodeInPage(url: string): Promise<Pixels> {
	const blob = await (await fetch(url)).blob();
	const bitmap = await createImageBitmap(blob, { premultiplyAlpha: "none" });
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d");
	if (context === null) {
		throw new Error("The page cannot draw.");
	}
	context.drawImage(bitmap, 0, 0);
	const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
	const step = 0x80_00;
	let binary = "";
	for (let start = 0; start < data.length; start += step) {
		binary += String.fromCodePoint(...data.subarray(start, start + step));
	}
	return { width: bitmap.width, height: bitmap.height, base64: btoa(binary) };
}

export function isPdfjs(value: unknown): value is typeof Pdfjs {
	return typeof value === "object" && value !== null && "getDocument" in value;
}

export async function pdfInPage(request: PdfRequest): Promise<string> {
	const pdfjs: unknown = await import(request.library);
	const worker: unknown = await import(request.worker);
	if (!isPdfjs(pdfjs)) {
		throw new Error("pdf.js did not load.");
	}
	Object.assign(globalThis, { pdfjsWorker: worker });
	const data = Uint8Array.from(atob(request.base64), (character) => character.codePointAt(0) ?? 0);
	const pdf = await pdfjs.getDocument({ data }).promise;
	const page = await pdf.getPage(1);
	const unit = page.getViewport({ scale: 1 });
	const viewport = page.getViewport({ scale: request.width / unit.width });
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(viewport.width);
	canvas.height = Math.round(viewport.height);
	const canvasContext = canvas.getContext("2d");
	if (canvasContext === null) {
		throw new Error("The page cannot draw.");
	}
	await page.render({ canvas, canvasContext, viewport }).promise;
	return canvas.toDataURL("image/png");
}

export async function settledInPage(): Promise<readonly number[]> {
	await document.fonts.ready;
	const pictures = Array.from(document.querySelectorAll("img"), (picture) => picture.decode());
	await Promise.allSettled(pictures);
	await new Promise((resolve) => {
		setTimeout(resolve, 300);
	});
	const box = document.querySelector(".botframe-export")?.getBoundingClientRect();
	if (box === undefined) {
		throw new Error("The file has no exported layer.");
	}
	return [box.left, box.top, box.width, box.height];
}

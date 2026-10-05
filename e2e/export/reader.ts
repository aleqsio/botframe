import type { ElectronApplication } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { decodeInPage, isPdfjs, pdfInPage, settledInPage } from "./pages";
import type { Pixels } from "./pages";
import type { Picture } from "./picture";

const resolve = createRequire(import.meta.url).resolve;
const PDFJS = pathToFileURL(resolve("pdfjs-dist/legacy/build/pdf.min.mjs")).href;
const PDFJS_WORKER = pathToFileURL(resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
const WINDOW_SIZE = 2304;

export interface Reader {
	app: ElectronApplication;
	view: number;
	page: number;
}

export async function openReader(app: ElectronApplication, folder: string): Promise<Reader> {
	const blank = join(folder, "reader.html");
	await writeFile(blank, "<!doctype html><meta charset=utf-8><body></body>");
	const ids = await app.evaluate(
		async ({ BrowserWindow }, { page, size }) => {
			const open = (): InstanceType<typeof BrowserWindow> =>
				new BrowserWindow({
					width: size,
					height: size,
					show: false,
					frame: false,
					transparent: true,
					backgroundColor: "#00000000",
					webPreferences: {
						offscreen: true,
						sandbox: true,
						contextIsolation: true,
						backgroundThrottling: false,
					},
				});
			const view = open();
			const reader = open();
			await reader.loadFile(page);
			return { view: view.id, page: reader.id };
		},
		{ page: blank, size: WINDOW_SIZE },
	);
	return { app, ...ids };
}

function inPage(reader: Reader, script: string): Promise<unknown> {
	return reader.app.evaluate(
		({ BrowserWindow }, { id, code }) => {
			const window = BrowserWindow.fromId(id);
			if (window === null) {
				throw new Error("The reader window is closed.");
			}
			return window.webContents.executeJavaScript(code) as Promise<unknown>;
		},
		{ id: reader.page, code: script },
	);
}

function pictureOf(value: unknown): Picture {
	const { width, height, base64 } =
		typeof value === "object" && value !== null ? (value as Partial<Pixels>) : {};
	if (typeof width !== "number" || typeof height !== "number" || typeof base64 !== "string") {
		throw new TypeError("The reader gave no picture.");
	}
	return { width, height, data: new Uint8Array(Buffer.from(base64, "base64")) };
}

async function decoded(reader: Reader, url: string): Promise<Picture> {
	return pictureOf(await inPage(reader, `(${decodeInPage.toString()})(${JSON.stringify(url)})`));
}

export function decodedBytes(reader: Reader, bytes: Uint8Array, type: string): Promise<Picture> {
	return decoded(reader, `data:${type};base64,${Buffer.from(bytes).toString("base64")}`);
}

export async function drawnPdf(reader: Reader, path: string, width: number): Promise<Picture> {
	const request = {
		library: PDFJS,
		worker: PDFJS_WORKER,
		base64: (await readFile(path)).toString("base64"),
		width,
	};
	const script = `const isPdfjs = ${isPdfjs.toString()}; (${pdfInPage.toString()})(${JSON.stringify(request)})`;
	const url = await inPage(reader, script);
	if (typeof url !== "string") {
		throw new TypeError("pdf.js gave no picture.");
	}
	return decoded(reader, url);
}

export async function quartzPdf(reader: Reader, path: string, longSide: number): Promise<Picture> {
	const out = `${path}.quartz.png`;
	execFileSync("/usr/bin/sips", [
		"-s",
		"format",
		"png",
		"--resampleHeightWidthMax",
		String(longSide),
		path,
		"--out",
		out,
	]);
	return decodedBytes(reader, await readFile(out), "image/png");
}

export function unzipped(path: string, folder: string): string {
	execFileSync("unzip", ["-o", "-q", path, "-d", folder]);
	return join(folder, "index.html");
}

export async function capturedPage(reader: Reader, path: string, width: number): Promise<Picture> {
	const settle = `(${settledInPage.toString()})()`;
	const base64 = await reader.app.evaluate(
		async ({ BrowserWindow }, { id, url, wide, code }) => {
			const window = BrowserWindow.fromId(id);
			if (window === null) {
				throw new Error("The view window is closed.");
			}
			const contents = window.webContents;
			contents.setZoomFactor(1);
			await contents.loadURL(url);
			const box: unknown = await contents.executeJavaScript(code);
			const [left = 0, top = 0, boxWidth = 1, boxHeight = 1] = Array.isArray(box)
				? box.map(Number)
				: [];
			const zoom = wide / boxWidth;
			contents.setZoomFactor(zoom);
			await contents.executeJavaScript(code);
			const rect = { x: left * zoom, y: top * zoom, width: wide, height: boxHeight * zoom };
			const image = await contents.capturePage({
				x: Math.round(rect.x),
				y: Math.round(rect.y),
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			});
			return image.toPNG().toString("base64");
		},
		{ id: reader.view, url: pathToFileURL(path).href, wide: width, code: settle },
	);
	return decodedBytes(reader, Buffer.from(base64, "base64"), "image/png");
}

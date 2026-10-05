/// <reference types="vite/client" />
import { fontAssetOf } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import type { FontFile } from "../../document/fonts";
import { dataUrlBytes } from "../dataUrl";
import { faceSourcesOf } from "./fontFaceCss";
import type { FaceSource } from "./fontFaceCss";
import { cssUrl, googleFamilies, nearestWeight } from "./googleFonts";
import type { GoogleFamily } from "./googleFonts";
import interCss from "./inter/inter.css?raw";

export interface FontRequest {
	family: string;
	italic: boolean;
	weight: number;
}

interface CssSource {
	css: string;
	bytesOf: (url: string) => Promise<Uint8Array<ArrayBuffer>>;
}

const BUNDLED_FAMILY = "Inter";
const BUNDLED_FILES = import.meta.glob<string>("./inter/*.woff2", {
	query: "?inline",
	import: "default",
});
const loading = new WeakMap<DesignDocument, Map<string, Promise<boolean>>>();

async function bundledBytes(url: string): Promise<Uint8Array<ArrayBuffer>> {
	const file = BUNDLED_FILES[url.replace("./", "./inter/")];
	if (file === undefined) {
		throw new Error(`the application has no file ${url}`);
	}
	return dataUrlBytes(await file());
}

async function downloadedBytes(url: string): Promise<Uint8Array<ArrayBuffer>> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`the font file ${url} did not load`);
	}
	return new Uint8Array(await response.arrayBuffer());
}

function coversNearest(doc: DesignDocument, request: FontRequest, family: GoogleFamily): boolean {
	const italic = request.italic && family.italic;
	return doc.fonts.covers(family.family, italic, nearestWeight(family, request.weight));
}

async function cssSourceOf(doc: DesignDocument, request: FontRequest): Promise<CssSource | null> {
	if (request.family === BUNDLED_FAMILY) {
		return { css: interCss, bytesOf: bundledBytes };
	}
	const family = (await googleFamilies()).find((held) => held.family === request.family);
	if (family === undefined || coversNearest(doc, request, family)) {
		return null;
	}
	const response = await fetch(cssUrl(family, request.italic, request.weight));
	return response.ok ? { css: await response.text(), bytesOf: downloadedBytes } : null;
}

async function fileOf(source: FaceSource, css: CssSource): Promise<FontFile> {
	const asset = await fontAssetOf(await css.bytesOf(source.url));
	if (asset === null) {
		throw new Error(`the file ${source.url} is not a WOFF2 font`);
	}
	return { asset, face: source.face };
}

async function load(doc: DesignDocument, request: FontRequest): Promise<boolean> {
	const source = await cssSourceOf(doc, request);
	if (source === null) {
		return false;
	}
	const faces = faceSourcesOf(source.css).filter((held) => held.face.family === request.family);
	doc.fonts.add(await Promise.all(faces.map((face) => fileOf(face, source))));
	return faces.length > 0;
}

export function ensureFont(doc: DesignDocument, request: FontRequest): Promise<boolean> {
	if (doc.fonts.covers(request.family, request.italic, request.weight)) {
		return Promise.resolve(true);
	}
	const requests = loading.get(doc) ?? new Map<string, Promise<boolean>>();
	loading.set(doc, requests);
	const key = `${request.family}|${String(request.italic)}|${request.weight}`;
	const held = requests.get(key);
	if (held !== undefined) {
		return held;
	}
	const started = load(doc, request).catch(() => {
		requests.delete(key);
		return false;
	});
	requests.set(key, started);
	return started;
}

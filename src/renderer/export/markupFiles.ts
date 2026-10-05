import { base64Of } from "./base64";
import type { LayerMarkup } from "./markup";
import { zipOf } from "./zip";
import type { ZipEntry } from "./zip";

interface Asset {
	url: string;
	type: string;
	bytes: Uint8Array;
}

const BLOB_URL = /blob:[^"'&)\s]+/gu;

function assetsIn(markup: LayerMarkup): readonly Asset[] {
	const urls = new Set(`${markup.html}${markup.css}`.match(BLOB_URL) ?? []);
	return [...urls].flatMap((url) => {
		const asset = markup.assets.get(url);
		return asset === undefined ? [] : [{ url, type: asset.type, bytes: asset.bytes }];
	});
}

function replaced(text: string, urls: ReadonlyMap<string, string>): string {
	return text.replace(BLOB_URL, (url) => urls.get(url) ?? url);
}

function inlined(markup: LayerMarkup): LayerMarkup {
	const assets = assetsIn(markup);
	const urls = new Map(
		assets.map((asset) => [asset.url, `data:${asset.type};base64,${base64Of(asset.bytes)}`]),
	);
	return { ...markup, html: replaced(markup.html, urls), css: replaced(markup.css, urls) };
}

function escapedText(text: string): string {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function page(title: string, head: string, body: string): string {
	return [
		"<!doctype html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width">',
		`<title>${escapedText(title)}</title>`,
		head,
		"</head>",
		`<body style="margin: 0">${body}</body>`,
		"</html>",
		"",
	].join("\n");
}

const encoder = new TextEncoder();

export function htmlFile(markup: LayerMarkup, title: string): Uint8Array {
	const { html, css } = inlined(markup);
	return encoder.encode(page(title, `<style>\n${css}\n</style>`, html));
}

function extensionOf(type: string): string {
	const [, subtype = "bin"] = type.split("/");
	return subtype.replace("svg+xml", "svg").replace("jpeg", "jpg");
}

export function zipFile(markup: LayerMarkup, title: string): Uint8Array {
	const assets = assetsIn(markup);
	const paths = new Map(
		assets.map((asset, index) => [
			asset.url,
			`assets/asset-${index + 1}.${extensionOf(asset.type)}`,
		]),
	);
	const head = '<link rel="stylesheet" href="styles.css">';
	const entries: ZipEntry[] = [
		{ path: "index.html", bytes: encoder.encode(page(title, head, replaced(markup.html, paths))) },
		{ path: "styles.css", bytes: encoder.encode(`${replaced(markup.css, paths)}\n`) },
		...assets.map((asset) => ({ path: paths.get(asset.url) ?? "", bytes: asset.bytes })),
	];
	return zipOf(entries);
}

function flattenedShadows(html: string): string {
	return html
		.replaceAll('<template shadowrootmode="open">', '<div style="display: contents">')
		.replaceAll("</template>", "</div>");
}

export function svgFile(markup: LayerMarkup): Uint8Array {
	const { html, css, width, height } = inlined(markup);
	const parsed = Document.parseHTMLUnsafe(`<div>${flattenedShadows(html)}</div>`);
	const holder = parsed.body.firstElementChild ?? parsed.createElement("div");
	const style = parsed.createElement("style");
	style.textContent = css;
	holder.prepend(style);
	const xhtml = new XMLSerializer().serializeToString(holder);
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject>`,
		"</svg>",
		"",
	].join("\n");
	return encoder.encode(svg);
}

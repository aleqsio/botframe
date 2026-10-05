import type { Asset } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import { assetUrlOf } from "../assetUrl";
import { fontFaceCss } from "../fonts/fontFaceCss";
import { paintedBox } from "./drawScene";

export interface LayerMarkup {
	html: string;
	css: string;
	width: number;
	height: number;
	assets: ReadonlyMap<string, Asset>;
}

const EDITOR_PARTS = ".guide-space, .frame-label";
const EDITOR_ATTRIBUTES = ["data-layer-id", "data-selected", "data-dragging", "data-export-target"];
const EDITOR_SELECTOR = /data-export|#stage|#viewport|#root|#export-probe|:root|\bhtml\b|\bbody\b/u;

function shadowRoots(root: Element): ShadowRoot[] {
	return [root, ...root.querySelectorAll("*")].flatMap((element) => element.shadowRoot ?? []);
}

function outerHtml(element: Element): string {
	const shell = element.cloneNode(false);
	const open = shell instanceof Element ? shell.outerHTML : "<div></div>";
	const inner = element.getHTML({ shadowRoots: shadowRoots(element) });
	return open.replace(/<\/\w+>$/u, (close) => `${inner}${close}`);
}

function cleaned(probe: HTMLElement): void {
	for (const part of probe.querySelectorAll(EDITOR_PARTS)) {
		part.remove();
	}
	for (const attribute of EDITOR_ATTRIBUTES) {
		for (const element of probe.querySelectorAll(`[${attribute}]`)) {
			element.removeAttribute(attribute);
		}
	}
}

function styleRules(): readonly CSSStyleRule[] {
	return Array.from(document.styleSheets).flatMap((sheet) =>
		Array.from(sheet.cssRules).filter((rule) => rule instanceof CSSStyleRule),
	);
}

function matchedCss(probe: HTMLElement): string {
	const elements = [...probe.querySelectorAll("*")];
	return styleRules()
		.filter((rule) => !EDITOR_SELECTOR.test(rule.selectorText))
		.filter((rule) => elements.some((element) => element.matches(rule.selectorText)))
		.map((rule) => rule.cssText)
		.join("\n");
}

function facesCss(doc: DesignDocument, probe: HTMLElement): string {
	const styles = Array.from(probe.querySelectorAll("*"), (element) => getComputedStyle(element));
	const families = styles.map((style) => style.fontFamily.toLowerCase()).join(",");
	const italic = styles.some((style) => style.fontStyle === "italic");
	const faces = doc.fonts
		.faces()
		.filter((face) => families.includes(face.family.toLowerCase()) && (italic || !face.italic));
	return fontFaceCss(
		faces,
		(asset) => assetUrlOf((held) => doc.fonts.fileOf(held), asset)?.url ?? null,
	);
}

function framed(probe: HTMLElement, layer: Element): string {
	const outer = probe.getBoundingClientRect();
	const box = layer instanceof HTMLElement ? paintedBox(layer) : layer.getBoundingClientRect();
	const left = outer.left - box.left;
	const top = outer.top - box.top;
	const inner = probe.getHTML({ shadowRoots: shadowRoots(probe) });
	return [
		`<div class="botframe-export" style="position: relative; overflow: hidden; width: ${box.width}px; height: ${box.height}px">`,
		`<div style="position: absolute; left: ${left}px; top: ${top}px">${inner}</div>`,
		"</div>",
	].join("");
}

function assetsByUrl(doc: DesignDocument): ReadonlyMap<string, Asset> {
	const media = doc.assets.ids().map((id) => [id, doc.assets.get(id)] as const);
	const fonts = doc.fonts
		.faces()
		.map((face) => [face.asset, doc.fonts.fileOf(face.asset)] as const);
	return new Map(
		[...media, ...fonts].flatMap(([id, asset]) => {
			const url = asset === null ? null : assetUrlOf(() => asset, id)?.url;
			return asset === null || url === undefined || url === null ? [] : [[url, asset] as const];
		}),
	);
}

export function layerMarkup(doc: DesignDocument, element: HTMLElement): LayerMarkup {
	const probe = document.createElement("div");
	probe.id = "export-probe";
	probe.style.cssText = "position: absolute; left: 0; top: 0; --zoom: 1";
	document.body.append(probe);
	try {
		probe.setHTMLUnsafe(outerHtml(element));
		cleaned(probe);
		const layer = probe.firstElementChild;
		if (layer === null) {
			throw new Error("botframe did not copy the layer.");
		}
		const { width, height } = layer instanceof HTMLElement ? paintedBox(layer) : new DOMRect();
		const css = [facesCss(doc, probe), matchedCss(probe)].filter((part) => part !== "").join("\n");
		return { html: framed(probe, layer), css, width, height, assets: assetsByUrl(doc) };
	} finally {
		probe.remove();
	}
}

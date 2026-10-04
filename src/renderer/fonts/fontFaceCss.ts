import type { AssetId } from "../../document/assets";
import type { FaceShape, StoredFace } from "../../document/fonts";
import { quotedFamily } from "../textStyle";

export interface FaceSource {
	face: FaceShape;
	url: string;
}

const FACE_BLOCK = /@font-face\s*\{(?<body>[^}]*)\}/gu;
const QUOTES = /^["']|["']$/gu;
const WEIGHTS = /^(?<low>\d+)(?:\s+(?<high>\d+))?$/u;
const SOURCE = /url\((?<url>[^)]+)\)/u;
const EVERY_CODE_POINT = "U+0-10FFFF";

function propertyOf(body: string, name: string): string | null {
	const match = new RegExp(`${name}\\s*:\\s*(?<value>[^;]+);`, "u").exec(body);
	return match?.groups?.["value"]?.trim() ?? null;
}

function weightOf(text: string | null): readonly [number, number] | null {
	const groups = WEIGHTS.exec(text ?? "")?.groups;
	if (groups === undefined) {
		return null;
	}
	const low = Number(groups["low"]);
	return [low, groups["high"] === undefined ? low : Number(groups["high"])];
}

function sourceOf(body: string): FaceSource | null {
	const family = propertyOf(body, "font-family")?.replace(QUOTES, "");
	const weight = weightOf(propertyOf(body, "font-weight"));
	const url = SOURCE.exec(propertyOf(body, "src") ?? "")?.groups?.["url"]?.replace(QUOTES, "");
	if (family === undefined || weight === null || url === undefined) {
		return null;
	}
	const italic = propertyOf(body, "font-style") === "italic";
	const unicodeRange = propertyOf(body, "unicode-range") ?? EVERY_CODE_POINT;
	return { face: { family, italic, weight, unicodeRange }, url };
}

export function faceSourcesOf(css: string): FaceSource[] {
	return [...css.matchAll(FACE_BLOCK)].flatMap(
		(match) => sourceOf(match.groups?.["body"] ?? "") ?? [],
	);
}

function faceRule(face: StoredFace, url: string): string {
	const [low, high] = face.weight;
	return [
		"@font-face {",
		`font-family: ${quotedFamily(face.family)};`,
		`font-style: ${face.italic ? "italic" : "normal"};`,
		`font-weight: ${low === high ? low : `${low} ${high}`};`,
		`src: url("${url}") format("woff2");`,
		`unicode-range: ${face.unicodeRange};`,
		"}",
	].join(" ");
}

export function fontFaceCss(
	faces: readonly StoredFace[],
	urlOf: (asset: AssetId) => string | null,
): string {
	return faces
		.flatMap((face) => {
			const url = urlOf(face.asset);
			return url === null ? [] : [faceRule(face, url)];
		})
		.join("\n");
}

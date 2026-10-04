import { LoroText } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { oneOf } from "./layout";
import { readBoolean, readNumber, readString } from "./read";
import type { FieldSource } from "./read";
import { writeVariant } from "./write";

const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
const VERTICAL_ALIGNS = ["top", "middle", "bottom"] as const;
const DECORATIONS = ["none", "underline", "line-through"] as const;
const TEXT_CASES = ["none", "uppercase", "lowercase", "capitalize"] as const;

export interface TextStyle {
	fontFamily: string;
	fontWeight: number;
	italic: boolean;
	fontSize: number;
	lineHeight: number;
	letterSpacing: number;
	textAlign: (typeof TEXT_ALIGNS)[number];
	verticalAlign: (typeof VERTICAL_ALIGNS)[number];
	decoration: (typeof DECORATIONS)[number];
	textCase: (typeof TEXT_CASES)[number];
}

export interface TextGeometry extends TextStyle {
	kind: "text";
	content: string;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
	fontFamily: "Inter",
	fontWeight: 400,
	italic: false,
	fontSize: 16,
	lineHeight: 1.2,
	letterSpacing: 0,
	textAlign: "left",
	verticalAlign: "top",
	decoration: "none",
	textCase: "none",
};

const CONTENT = "content";
const MIN_WEIGHT = 1;
const MAX_WEIGHT = 1000;

function heldWeight(weight: number): number {
	return Math.min(Math.max(Math.round(weight), MIN_WEIGHT), MAX_WEIGHT);
}

function positive(value: number, fallback: number): number {
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function contentOf(value: unknown): string {
	if (value instanceof LoroText) {
		return value.toString();
	}
	return typeof value === "string" ? value : "";
}

export function textGeometryOf(fields: FieldSource | null): TextGeometry {
	const base = DEFAULT_TEXT_STYLE;
	return {
		kind: "text",
		content: contentOf(fields?.get(CONTENT)),
		fontFamily: readString(fields, "fontFamily", base.fontFamily),
		fontWeight: heldWeight(readNumber(fields, "fontWeight", base.fontWeight)),
		italic: readBoolean(fields, "italic", base.italic),
		fontSize: positive(readNumber(fields, "fontSize", base.fontSize), base.fontSize),
		lineHeight: positive(readNumber(fields, "lineHeight", base.lineHeight), base.lineHeight),
		letterSpacing: readNumber(fields, "letterSpacing", base.letterSpacing),
		textAlign: oneOf(TEXT_ALIGNS, fields?.get("textAlign"), base.textAlign),
		verticalAlign: oneOf(VERTICAL_ALIGNS, fields?.get("verticalAlign"), base.verticalAlign),
		decoration: oneOf(DECORATIONS, fields?.get("decoration"), base.decoration),
		textCase: oneOf(TEXT_CASES, fields?.get("textCase"), base.textCase),
	};
}

function writeContent(values: LoroMap, content: string): void {
	if (!(values.get(CONTENT) instanceof LoroText)) {
		values.delete(CONTENT);
	}
	values.ensureMergeableText(CONTENT).update(content);
}

export function writeTextGeometry(bag: LoroMap, geometry: TextGeometry): void {
	const { content, ...style } = geometry;
	writeVariant(bag, style);
	writeContent(bag.ensureMergeableMap(geometry.kind), content);
}

import type { CSSProperties } from "react";
import type { SizeMode } from "../document/layout";
import type { TextGeometry, TextStyle } from "../document/text";

const VERTICAL_PLACE: Readonly<Record<TextStyle["verticalAlign"], string>> = {
	top: "flex-start",
	middle: "center",
	bottom: "flex-end",
};

const GENERIC_FAMILY = "sans-serif";
const QUOTE = /["\\]/gu;

export function fontFamilyText(family: string): string {
	return `"${family.replace(QUOTE, (character) => `\\${character}`)}", ${GENERIC_FAMILY}`;
}

export function textBoxStyle(geometry: TextGeometry, width: SizeMode): CSSProperties {
	return {
		display: "flex",
		flexDirection: "column",
		justifyContent: VERTICAL_PLACE[geometry.verticalAlign],
		fontFamily: fontFamilyText(geometry.fontFamily),
		fontWeight: geometry.fontWeight,
		fontStyle: geometry.italic ? "italic" : "normal",
		fontSize: `${geometry.fontSize}px`,
		lineHeight: geometry.lineHeight,
		letterSpacing: `${geometry.letterSpacing}px`,
		textAlign: geometry.textAlign,
		textDecorationLine: geometry.decoration,
		textTransform: geometry.textCase,
		whiteSpace: width === "hug" ? "pre" : "pre-wrap",
		overflowWrap: "break-word",
	};
}

export function textPaintStyle(paint: CSSProperties): CSSProperties {
	return { ...paint, backgroundClip: "text", color: "transparent" };
}

import type { CSSProperties } from "react";
import type { LayerLayout, Track } from "../../../document/layout";
import { alignStyle } from "../../layerStyle";
import { isFlex } from "./selfText";
import { trackFactor } from "./tracks";

export interface BlockSize {
	width: number;
	height: number;
}

const PACKED_SIZES: readonly number[] = [22, 34, 16];
const WRAPPED_WIDTHS: readonly number[] = [48, 36, 56, 40, 52, 36];
const THICKNESS = 14;
const WRAPPED_COLUMN_WIDTH = 34;
const COLUMN_STEP = 22;
const ROW_STEP = 16;

export const PACKED_COUNT = PACKED_SIZES.length;
export const WRAPPED_COUNT = WRAPPED_WIDTHS.length;

export function previewTemplate(tracks: readonly Track[], step: number): string {
	return tracks.map((track) => `${Math.round(trackFactor(track) * step)}px`).join(" ");
}

export function previewStyle(layout: LayerLayout): CSSProperties {
	if (layout.display === "grid") {
		return {
			display: "grid",
			gridTemplateColumns: previewTemplate(layout.tracks.columns, COLUMN_STEP),
			gridTemplateRows: previewTemplate(layout.tracks.rows, ROW_STEP),
			...alignStyle(layout),
		};
	}
	return {
		flexDirection: layout.display === "column" ? "column" : "row",
		flexWrap: layout.wrap ? "wrap" : "nowrap",
		...alignStyle(layout),
	};
}

export function previewCellStyle(layout: LayerLayout): CSSProperties {
	const style = alignStyle(layout);
	return { justifyContent: style.justifyItems, alignItems: style.alignItems };
}

export function isWrapped(layout: LayerLayout): boolean {
	return layout.wrap && isFlex(layout.display);
}

export function blockSize(layout: LayerLayout, index: number): BlockSize {
	const upright = layout.display === "column";
	if (isWrapped(layout)) {
		const width = upright ? WRAPPED_COLUMN_WIDTH : (WRAPPED_WIDTHS[index] ?? THICKNESS);
		return { width, height: THICKNESS };
	}
	const size = PACKED_SIZES[index] ?? THICKNESS;
	return upright ? { width: size, height: THICKNESS } : { width: THICKNESS, height: size };
}

export function previewCaption(layout: LayerLayout): string {
	if (isWrapped(layout)) {
		return "lines";
	}
	return layout.display === "grid" ? "items in cells" : "";
}

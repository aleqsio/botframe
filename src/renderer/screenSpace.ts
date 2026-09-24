import type { CSSProperties } from "react";

const UNSCALE = "scale(calc(1 / var(--zoom)))";
const ZOOMED_FULL = "calc(100% * var(--zoom))";

export const SCREEN_BOX: CSSProperties = {
	width: ZOOMED_FULL,
	height: ZOOMED_FULL,
	transform: UNSCALE,
};

export function zoomed(pixels: number): string {
	return `calc(${pixels}px * var(--zoom))`;
}

export function zoomedLengths(lengths: string): string {
	return lengths
		.split(" ")
		.map((length) => `calc(${length} * var(--zoom))`)
		.join(" ");
}

export function unscaled(canvasTransform: string): string {
	return `scale(var(--zoom)) ${canvasTransform} ${UNSCALE}`;
}

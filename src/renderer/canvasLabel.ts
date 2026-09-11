import type { CSSProperties } from "react";
import type { Layer, Rect } from "../document/layer";
import { isArtboard } from "./components/layerEntry";

export function hasCanvasLabel(layer: Layer): boolean {
	return layer.parent === null && isArtboard(layer);
}

export function canvasLabelStyle(box: Rect): CSSProperties {
	return { translate: `${box.x}px ${box.y}px`, maxWidth: `calc(${box.width}px * var(--zoom))` };
}

import type { CSSProperties } from "react";
import type { Rect } from "../document/layer";

export function canvasLabelStyle(box: Rect): CSSProperties {
	return { translate: `${box.x}px ${box.y}px`, maxWidth: `calc(${box.width}px * var(--zoom))` };
}

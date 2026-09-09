import type { CSSProperties } from "react";
import type { Geometry, Layer } from "../document/layer";

declare module "react" {
	interface CSSProperties {
		cornerShape?: string | undefined;
	}
}

function cornerShape(cornerSmoothing: number): string | undefined {
	return cornerSmoothing > 0 ? `superellipse(${2 + cornerSmoothing * 3})` : undefined;
}

function geometryStyle(geometry: Geometry): CSSProperties {
	switch (geometry.kind) {
		case "rectangle": {
			return {
				borderRadius: `${geometry.cornerRadius}px`,
				cornerShape: cornerShape(geometry.cornerSmoothing),
			};
		}
		case "ellipse": {
			return { borderRadius: "50%" };
		}
		case "path": {
			return { clipPath: `path("${geometry.d}")` };
		}
		case "unsupported": {
			break;
		}
	}
	return {};
}

export function layerStyle(layer: Layer): CSSProperties {
	return {
		transform: `translate3d(${layer.x}px, ${layer.y}px, 0)`,
		width: `${layer.width}px`,
		height: `${layer.height}px`,
		background: layer.fill,
		...geometryStyle(layer.geometry),
	};
}

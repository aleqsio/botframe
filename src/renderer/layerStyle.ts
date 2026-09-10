import type { CSSProperties } from "react";
import type { Geometry, Layer } from "../document/layer";
import { halfSizeOf } from "./input/layerSpace";

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

export function layerTransform(layer: Layer): string {
	const place = `translate3d(${layer.x}px, ${layer.y}px, 0)`;
	if (layer.rotation === 0) {
		return place;
	}
	const half = halfSizeOf(layer);
	const turn = `rotate(${layer.rotation}deg)`;
	return `${place} translate(${half.x}px, ${half.y}px) ${turn} translate(${-half.x}px, ${-half.y}px)`;
}

export function layerStyle(layer: Layer): CSSProperties {
	return {
		transform: layerTransform(layer),
		width: `${layer.width}px`,
		height: `${layer.height}px`,
		background: layer.fill,
		overflow: layer.clip ? "hidden" : undefined,
		...geometryStyle(layer.geometry),
	};
}

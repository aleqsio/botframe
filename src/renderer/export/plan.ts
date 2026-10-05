import type { Rect } from "../../document/layer";
import type { CaptureRect } from "../../shared/exportFile";
import type { Camera, Point } from "../state/camera";

export interface Screen {
	width: number;
	height: number;
	ratio: number;
}

export interface Tile {
	camera: Camera;
	source: CaptureRect;
	at: Point;
	size: { width: number; height: number };
}

export interface ExportPlan {
	width: number;
	height: number;
	tiles: readonly Tile[];
}

export function fittedScale(bounds: Rect, scale: number, longSide: number): number {
	return Math.min(scale, longSide / Math.max(bounds.width, bounds.height, 1));
}

function starts(length: number, step: number): readonly number[] {
	return Array.from({ length: Math.max(1, Math.ceil(length / step)) }, (_, index) => index * step);
}

export function planExport(bounds: Rect, scale: number, screen: Screen): ExportPlan {
	const { ratio } = screen;
	const zoom = scale / ratio;
	const width = Math.max(1, Math.round(bounds.width * scale));
	const height = Math.max(1, Math.round(bounds.height * scale));
	const step = { x: Math.floor(screen.width * ratio), y: Math.floor(screen.height * ratio) };
	const tiles = starts(height, step.y).flatMap((top) =>
		starts(width, step.x).map((left) => {
			const source = {
				x: 0,
				y: 0,
				width: Math.ceil(Math.min(step.x, width - left) / ratio),
				height: Math.ceil(Math.min(step.y, height - top) / ratio),
			};
			return {
				camera: { x: -bounds.x * zoom - left / ratio, y: -bounds.y * zoom - top / ratio, zoom },
				source,
				at: { x: left, y: top },
				size: {
					width: Math.round(source.width * ratio),
					height: Math.round(source.height * ratio),
				},
			};
		}),
	);
	return { width, height, tiles };
}

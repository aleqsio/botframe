export interface Point {
	x: number;
	y: number;
}

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface StagePoint {
	client: Point;
	stage: Point;
	canvas: Point;
}

export interface ViewportDelta {
	pan: Point;
	scale: number;
}

export const IDENTITY_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 64;

export type ZoomDirection = "in" | "out";

const ZOOM_LEVELS = [MIN_ZOOM, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32, MAX_ZOOM] as const;
const SAME_ZOOM = 1e-6;

function clampZoom(zoom: number): number {
	return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export function toCanvasPoint(camera: Camera, stagePoint: Point): Point {
	return {
		x: (stagePoint.x - camera.x) / camera.zoom,
		y: (stagePoint.y - camera.y) / camera.zoom,
	};
}

export function viewportCenter(camera: Camera, size: { width: number; height: number }): Point {
	return toCanvasPoint(camera, { x: size.width / 2, y: size.height / 2 });
}

export function moveCamera(camera: Camera, pan: Point): Camera {
	return { x: camera.x + pan.x, y: camera.y + pan.y, zoom: camera.zoom };
}

export function zoomCameraAt(camera: Camera, stagePoint: Point, scale: number): Camera {
	const zoom = clampZoom(camera.zoom * scale);
	const applied = zoom / camera.zoom;
	return {
		x: stagePoint.x + (camera.x - stagePoint.x) * applied,
		y: stagePoint.y + (camera.y - stagePoint.y) * applied,
		zoom,
	};
}

export function applyViewportDelta(camera: Camera, at: Point, delta: ViewportDelta): Camera {
	return zoomCameraAt(moveCamera(camera, delta.pan), at, delta.scale);
}

export function steppedZoom(zoom: number, direction: ZoomDirection): number {
	if (direction === "in") {
		return ZOOM_LEVELS.find((level) => level > zoom * (1 + SAME_ZOOM)) ?? MAX_ZOOM;
	}
	return ZOOM_LEVELS.findLast((level) => level < zoom * (1 - SAME_ZOOM)) ?? MIN_ZOOM;
}

export function zoomPercent(zoom: number): string {
	return `${Math.round(zoom * 100)}%`;
}

export interface DotGrid {
	spacing: number;
	offset: Point;
}

const DOT_SPACING = 20;

function wrap(value: number, period: number): number {
	return ((value % period) + period) % period;
}

export function dotGrid(camera: Camera): DotGrid {
	const octave = Math.ceil(-Math.log2(camera.zoom) - SAME_ZOOM);
	const spacing = DOT_SPACING * camera.zoom * 2 ** octave;
	return {
		spacing,
		offset: { x: wrap(camera.x - spacing / 2, spacing), y: wrap(camera.y - spacing / 2, spacing) },
	};
}

export function cameraTransform(camera: Camera): string {
	return `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
}

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

function clampZoom(zoom: number): number {
	return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export function toCanvasPoint(camera: Camera, stagePoint: Point): Point {
	return {
		x: (stagePoint.x - camera.x) / camera.zoom,
		y: (stagePoint.y - camera.y) / camera.zoom,
	};
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

export function cameraTransform(camera: Camera): string {
	return `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
}

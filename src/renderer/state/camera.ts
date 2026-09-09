export interface Point {
	x: number;
	y: number;
}

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export const IDENTITY_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

export function toCanvasPoint(camera: Camera, stagePoint: Point): Point {
	return {
		x: (stagePoint.x - camera.x) / camera.zoom,
		y: (stagePoint.y - camera.y) / camera.zoom,
	};
}

export function cameraTransform(camera: Camera): string {
	return `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
}

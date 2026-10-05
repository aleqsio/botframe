export const RENDER_IMAGE = "export:render";
export const EXPORT_SCENE = "export:scene";
export const EXPORT_DONE = "export:done";
export const EXPORT_READY = "export:ready";
export const CAPTURE_PAGE = "export:capture";
export const SAVE_IMAGES = "export:save";

export const EXPORT_PAGE_HASH = "export";

export const IMAGE_EXTENSION = "png";
export const IMAGE_TYPE = "image/png";

export interface CaptureRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ExportScene {
	file: Uint8Array;
	target: string | null;
	area: CaptureRect | null;
	scale: number;
	longSide: number;
}

export interface ImageFile {
	name: string;
	bytes: Uint8Array;
}

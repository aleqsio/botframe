export const RENDER_EXPORT = "export:render";
export const EXPORT_SCENE = "export:scene";
export const EXPORT_DONE = "export:done";
export const EXPORT_READY = "export:ready";
export const CAPTURE_PAGE = "export:capture";
export const PRINT_PAGE = "export:print";
export const SAVE_EXPORTS = "export:save";

export const EXPORT_PAGE_HASH = "export";

export type ExportFormat = "png" | "jpg" | "svg" | "pdf" | "html" | "zip";

export interface FormatInfo {
	id: ExportFormat;
	label: string;
	title: string;
	type: string;
	raster: boolean;
}

export const EXPORT_FORMATS: readonly FormatInfo[] = [
	{ id: "png", label: "PNG", title: "PNG image", type: "image/png", raster: true },
	{ id: "jpg", label: "JPG", title: "JPEG image", type: "image/jpeg", raster: true },
	{
		id: "svg",
		label: "SVG",
		title: "SVG with the HTML inside",
		type: "image/svg+xml",
		raster: false,
	},
	{ id: "pdf", label: "PDF", title: "PDF document", type: "application/pdf", raster: false },
	{ id: "html", label: "HTML", title: "One HTML page", type: "text/html", raster: false },
	{
		id: "zip",
		label: "ZIP",
		title: "HTML and CSS files in a ZIP",
		type: "application/zip",
		raster: false,
	},
];

export interface CaptureRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PageSize {
	width: number;
	height: number;
}

export interface ExportScene {
	file: Uint8Array;
	format: ExportFormat;
	target: string | null;
	area: CaptureRect | null;
	scale: number;
	longSide: number;
}

export interface ExportedFile {
	name: string;
	format: ExportFormat;
	bytes: Uint8Array;
}

export function uniqueNames(names: readonly string[]): readonly string[] {
	const taken = new Set<string>();
	return names.map((name) => {
		let unique = name;
		for (let count = 2; taken.has(unique.toLowerCase()); count += 1) {
			unique = `${name} ${count}`;
		}
		taken.add(unique.toLowerCase());
		return unique;
	});
}

export function exportFileNames(files: readonly ExportedFile[]): readonly string[] {
	const names = uniqueNames(files.map((file) => file.name));
	return names.map((name, index) => `${name}.${files[index]?.format ?? ""}`);
}

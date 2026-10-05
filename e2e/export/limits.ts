import type { Difference } from "./picture";

export type Reader = "image" | "page" | "zip" | "pdf" | "quartz";

interface ExportArgs {
	format: "png" | "jpg" | "svg" | "pdf" | "html";
	scale?: number;
	html?: "embedded" | "separate";
}

export interface ExportOption {
	id: string;
	args: ExportArgs;
	extension: string;
	reader: Reader;
	threshold: number;
	changed: number;
}

export const MAX_BLOB = 256;

export const OPTIONS: readonly ExportOption[] = [
	{
		id: "png@2",
		args: { format: "png", scale: 2 },
		extension: "png",
		reader: "image",
		threshold: 24,
		changed: 0.002,
	},
	{
		id: "png@1",
		args: { format: "png", scale: 1 },
		extension: "png",
		reader: "image",
		threshold: 64,
		changed: 0.03,
	},
	{
		id: "png@0.5",
		args: { format: "png", scale: 0.5 },
		extension: "png",
		reader: "image",
		threshold: 96,
		changed: 0.06,
	},
	{
		id: "jpg",
		args: { format: "jpg", scale: 2 },
		extension: "jpg",
		reader: "image",
		threshold: 48,
		changed: 0.01,
	},
	{
		id: "svg",
		args: { format: "svg" },
		extension: "svg",
		reader: "page",
		threshold: 64,
		changed: 0.02,
	},
	{
		id: "pdf",
		args: { format: "pdf" },
		extension: "pdf",
		reader: "pdf",
		threshold: 64,
		changed: 0.03,
	},
	{
		id: "pdf-quartz",
		args: { format: "pdf" },
		extension: "pdf",
		reader: "quartz",
		threshold: 96,
		changed: 0.08,
	},
	{
		id: "html",
		args: { format: "html", html: "embedded" },
		extension: "html",
		reader: "page",
		threshold: 64,
		changed: 0.02,
	},
	{
		id: "zip",
		args: { format: "html", html: "separate" },
		extension: "zip",
		reader: "zip",
		threshold: 64,
		changed: 0.02,
	},
];

function percent(share: number): string {
	return `${(share * 100).toFixed(2)}%`;
}

export function problemsOf(
	option: ExportOption,
	found: Pick<Difference, "changed" | "blob">,
): string[] {
	const problems: string[] = [];
	if (found.changed > option.changed) {
		problems.push(
			`${percent(found.changed)} of the pixels changed; the limit is ${percent(option.changed)}`,
		);
	}
	if (found.blob > MAX_BLOB) {
		problems.push(`a changed area of ${found.blob} px; the limit is ${MAX_BLOB} px`);
	}
	return problems;
}

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Picture } from "./picture";
import { pngOf } from "./png";

export interface Cell {
	option: string;
	result: string;
	difference: string;
	changed: number;
	blob: number;
	problems: readonly string[];
}

export interface Row {
	example: string;
	reference: string;
	cells: readonly Cell[];
}

export async function savedPicture(
	folder: string,
	name: string,
	picture: Picture,
): Promise<string> {
	const path = join(folder, name);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, pngOf(picture));
	return name;
}

function escaped(text: string): string {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function cellHtml(cell: Cell): string {
	const verdict = cell.problems.length === 0 ? "pass" : "fail";
	const numbers = `${(cell.changed * 100).toFixed(2)}% changed, largest area ${cell.blob} px`;
	const problems = cell.problems.map((problem) => `<li>${escaped(problem)}</li>`).join("");
	return [
		`<td class="${verdict}">`,
		`<img src="${escaped(cell.result)}" alt="result"><img src="${escaped(cell.difference)}" alt="difference">`,
		`<p>${numbers}</p><ul>${problems}</ul></td>`,
	].join("");
}

function rowHtml(row: Row): string {
	const cells = row.cells.map((cell) => cellHtml(cell)).join("");
	return `<tr><th>${escaped(row.example)}</th><td><img src="${escaped(row.reference)}" alt="reference"></td>${cells}</tr>`;
}

const STYLE = [
	"body { font: 13px system-ui, sans-serif; margin: 16px; }",
	"table { border-collapse: collapse; }",
	"td, th { border: 1px solid #ccc; padding: 6px; vertical-align: top; }",
	"img { display: block; max-width: 240px; max-height: 180px; margin-bottom: 4px; background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 16px 16px; }",
	".fail { background: #fee2e2; }",
	".pass { background: #dcfce7; }",
	"ul { margin: 0; padding-left: 16px; }",
].join("\n");

export async function writeReport(folder: string, rows: readonly Row[]): Promise<string> {
	const options = rows[0]?.cells.map((cell) => `<th>${escaped(cell.option)}</th>`).join("") ?? "";
	const html = [
		"<!doctype html><meta charset=utf-8><title>Export check</title>",
		`<style>${STYLE}</style>`,
		"<p>Each cell shows the export as a picture, then the changed pixels in red over a faded reference.</p>",
		`<table><tr><th>Example</th><th>Reference (render, scale 2)</th>${options}</tr>`,
		...rows.map((row) => rowHtml(row)),
		"</table>",
	].join("\n");
	const path = join(folder, "index.html");
	await writeFile(path, html);
	return path;
}

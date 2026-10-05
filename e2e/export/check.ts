import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Example } from "../fixtures/export/example";
import { toolBytes, toolJson } from "./agent";
import { builtExample } from "./build";
import type { Ids } from "./build";
import { OPTIONS, problemsOf } from "./limits";
import type { ExportOption, Reader as ReaderKind } from "./limits";
import { difference, differencePicture, fitted, onWhite } from "./picture";
import type { Picture } from "./picture";
import { capturedPage, decodedBytes, drawnPdf, quartzPdf, unzipped } from "./reader";
import type { Reader } from "./reader";
import { savedPicture } from "./report";
import type { Cell, Row } from "./report";

const REFERENCE_SCALE = 2;
const IMAGE_TYPES: Readonly<Record<string, string>> = { png: "image/png", jpg: "image/jpeg" };
const CHECKED = OPTIONS.filter(
	(option) => option.reader !== "quartz" || process.platform === "darwin",
);

type Read = (reader: Reader, path: string, reference: Picture) => Promise<Picture>;

const READERS: Readonly<Record<ReaderKind, Read>> = {
	image: async (reader, path) =>
		decodedBytes(
			reader,
			await readFile(path),
			IMAGE_TYPES[path.split(".").at(-1) ?? ""] ?? "image/png",
		),
	page: (reader, path, reference) => capturedPage(reader, path, reference.width),
	zip: (reader, path, reference) =>
		capturedPage(reader, unzipped(path, `${path}.files`), reference.width),
	pdf: (reader, path, reference) => drawnPdf(reader, path, reference.width),
	quartz: (reader, path, reference) =>
		quartzPdf(reader, path, Math.max(reference.width, reference.height)),
};

interface Check {
	reader: Reader;
	folder: string;
	example: string;
	root: string;
}

async function checked(check: Check, option: ExportOption, reference: Picture): Promise<Cell> {
	const { reader, folder, example, root } = check;
	const path = join(folder, example, `${option.id}.${option.extension}`);
	await writeFile(path, await toolBytes("export_layer", { id: root, ...option.args }));
	const read = await READERS[option.reader](reader, path, reference);
	const picture = fitted(onWhite(read), reference.width, reference.height);
	const found = difference(reference, picture, option.threshold);
	const shown = differencePicture(reference, found);
	if (problemsOf(option, found).length > 0) {
		process.stdout.write(debugMaps(`${example} ${option.id} read ${read.width}x${read.height} ref ${reference.width}x${reference.height}`, reference, picture));
	}
	return {
		option: option.id,
		result: await savedPicture(folder, `${example}/${option.id}.result.png`, picture),
		difference: await savedPicture(folder, `${example}/${option.id}.difference.png`, shown),
		changed: found.changed,
		blob: found.blob,
		problems: problemsOf(option, found),
	};
}

async function caught(option: ExportOption, run: Promise<Cell>): Promise<Cell> {
	try {
		return await run;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			option: option.id,
			result: "",
			difference: "",
			changed: 1,
			blob: 0,
			problems: [message],
		};
	}
}

export async function checkedExample(
	reader: Reader,
	folder: string,
	example: Example,
	ids: Ids,
): Promise<Row> {
	const root = await builtExample(example, ids);
	await mkdir(join(folder, example.name), { recursive: true });
	const rendered = await toolBytes("render", { id: root, scale: REFERENCE_SCALE });
	const reference = onWhite(await decodedBytes(reader, rendered, "image/png"));
	const check = { reader, folder, example: example.name, root };
	const cells = await CHECKED.reduce(
		async (done: Promise<Cell[]>, option) => [
			...(await done),
			await caught(option, checked(check, option, reference)),
		],
		Promise.resolve([]),
	);
	await toolJson("delete_layers", { ids: [root] });
	const saved = await savedPicture(folder, `${example.name}/reference.png`, reference);
	return { example: example.name, reference: saved, cells };
}

function debugMap(picture: Picture): string[] {
	const columns = 60;
	const cell = picture.width / columns;
	const rows = Math.max(1, Math.round(picture.height / cell / 2));
	return Array.from({ length: rows }, (_, row) =>
		Array.from({ length: columns }, (_, column) => {
			let sum = 0;
			let count = 0;
			for (let y = Math.floor(row * cell * 2); y < Math.floor((row + 1) * cell * 2) && y < picture.height; y += 2) {
				for (let x = Math.floor(column * cell); x < Math.floor((column + 1) * cell); x += 2) {
					const at = (y * picture.width + x) * 4;
					sum += ((picture.data[at] ?? 0) + (picture.data[at + 1] ?? 0) + (picture.data[at + 2] ?? 0)) / 3;
					count += 1;
				}
			}
			const mean = sum / Math.max(1, count);
			return " .:-=+*#%@"[Math.min(9, Math.floor((255 - mean) / 25.6))] ?? "?";
		}).join(""),
	);
}

function debugMaps(title: string, reference: Picture, picture: Picture): string {
	const left = debugMap(reference);
	const right = debugMap(picture);
	return `${title}\n${left.map((line, index) => `${line} | ${right[index] ?? ""}`).join("\n")}\n`;
}

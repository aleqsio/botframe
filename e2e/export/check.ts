import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Example } from "../fixtures/export/example";
import { toolBytes, toolJson } from "./agent";
import { builtExample, fontsLoaded } from "./build";
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
	try {
		await fontsLoaded(example.fonts);
		return await checkedRoot({ reader, folder, example: example.name, root });
	} finally {
		await toolJson("delete_layers", { ids: [root] });
	}
}

async function checkedRoot(check: Check): Promise<Row> {
	const { reader, folder, example } = check;
	await mkdir(join(folder, example), { recursive: true });
	const rendered = await toolBytes("render", { id: check.root, scale: REFERENCE_SCALE });
	const reference = onWhite(await decodedBytes(reader, rendered, "image/png"));
	const cells = await CHECKED.reduce(
		async (done: Promise<Cell[]>, option) => [
			...(await done),
			await caught(option, checked(check, option, reference)),
		],
		Promise.resolve([]),
	);
	const saved = await savedPicture(folder, `${example}/reference.png`, reference);
	return { example, reference: saved, cells };
}

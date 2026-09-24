import type { ComponentSource } from "../document/component";
import type { Sources } from "../document/componentLibrary";
import { isComponentFile, readComponentFolder } from "../document/componentFiles";
import type { FileText, FolderRead } from "../document/componentFiles";
import type { DesignDocument } from "../document/document";

const HEX = 16;
const BYTE_DIGITS = 2;

export async function componentId(source: ComponentSource): Promise<string> {
	const text = JSON.stringify([source.name, source.html, source.css, source.props]);
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(HEX).padStart(BYTE_DIGITS, "0"),
	).join("");
}

function importReport(read: FolderRead): readonly string[] {
	const count = read.sources.length;
	const added = `Imported ${count} ${count === 1 ? "component" : "components"}.`;
	return [added, ...read.skipped.map((skip) => `Skipped ${skip.name}. ${skip.reason}`)];
}

function pathOf(file: File): string {
	return file.webkitRelativePath === "" ? file.name : file.webkitRelativePath;
}

async function textOf(file: File): Promise<FileText> {
	return { path: pathOf(file), text: await file.text() };
}

function addressed(sources: readonly ComponentSource[]): Promise<[string, ComponentSource][]> {
	return Promise.all(
		sources.map(async (source): Promise<[string, ComponentSource]> => [
			await componentId(source),
			source,
		]),
	);
}

export async function verifiedSources(sources: Sources): Promise<Sources> {
	const checked = await addressed(Object.values(sources));
	return Object.fromEntries(checked.filter(([id, source]) => sources[id] === source));
}

export async function importFolder(
	doc: DesignDocument,
	files: readonly File[],
): Promise<readonly string[]> {
	const texts = await Promise.all(
		files.filter((file) => isComponentFile(pathOf(file))).map((file) => textOf(file)),
	);
	const read = readComponentFolder(texts);
	doc.components.add(Object.fromEntries(await addressed(read.sources)));
	return importReport(read);
}

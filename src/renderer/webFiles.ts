import { FILE_EXTENSION, UNTITLED } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";

const DOT_EXTENSION = `.${FILE_EXTENSION}`;
const SAVE_PROMPT = "Save the document as:";

const names = new Map<string, string>();

function savedFile(name: string): SavedFile {
	const token = crypto.randomUUID();
	names.set(token, name);
	return { token, name };
}

function withoutExtension(name: string): string {
	return name.endsWith(DOT_EXTENSION) ? name.slice(0, -DOT_EXTENSION.length) : name;
}

function chooseFile(): Promise<File | null> {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = DOT_EXTENSION;
	return new Promise((resolve) => {
		input.addEventListener("change", () => {
			resolve(input.files?.[0] ?? null);
		});
		input.addEventListener("cancel", () => {
			resolve(null);
		});
		input.click();
	});
}

function download(bytes: Uint8Array, name: string): void {
	const url = URL.createObjectURL(new Blob([bytes.slice()]));
	const link = document.createElement("a");
	link.href = url;
	link.download = `${name}${DOT_EXTENSION}`;
	link.click();
	setTimeout(() => {
		URL.revokeObjectURL(url);
	});
}

function chooseName(current: string | undefined): string | null {
	const name = window.prompt(SAVE_PROMPT, current ?? UNTITLED)?.trim() ?? "";
	return name === "" ? null : withoutExtension(name);
}

export async function openFile(): Promise<OpenedFile | null> {
	const file = await chooseFile();
	if (file === null) {
		return null;
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	return { ...savedFile(withoutExtension(file.name)), bytes };
}

function saveTo(bytes: Uint8Array, token: string | null, saveAs: boolean): SavedFile | null {
	const current = token === null ? undefined : names.get(token);
	if (token !== null && current !== undefined && !saveAs) {
		download(bytes, current);
		return { token, name: current };
	}
	const name = chooseName(current);
	if (name === null) {
		return null;
	}
	download(bytes, name);
	return savedFile(name);
}

export function saveFile(
	bytes: Uint8Array,
	token: string | null,
	saveAs: boolean,
): Promise<SavedFile | null> {
	return Promise.resolve(saveTo(bytes, token, saveAs));
}

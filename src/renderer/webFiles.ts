import { FILE_EXTENSION } from "../shared/file";
import type { OpenedFile, SavedFile } from "../shared/file";

const DOT_EXTENSION = `.${FILE_EXTENSION}`;
const SAVE_PROMPT = "Save the document as:";
const REVOKE_DELAY_MS = 40_000;

function savedFile(name: string): SavedFile {
	return { token: crypto.randomUUID(), name };
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
	// Firefox and Safari stop a download when its blob URL is revoked too soon.
	// https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js
	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, REVOKE_DELAY_MS);
}

function chooseName(suggested: string): string | null {
	const name = withoutExtension(window.prompt(SAVE_PROMPT, suggested)?.trim() ?? "");
	return name === "" ? null : name;
}

export async function openFile(): Promise<OpenedFile | null> {
	const file = await chooseFile();
	if (file === null) {
		return null;
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	return { ...savedFile(withoutExtension(file.name)), bytes };
}

interface SaveRequest {
	token: string | null;
	name: string;
	saveAs: boolean;
}

function saveTo(
	bytes: Uint8Array,
	{ token, name: current, saveAs }: SaveRequest,
): SavedFile | null {
	if (token !== null && !saveAs) {
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
	name: string,
	saveAs: boolean,
): Promise<SavedFile | null> {
	return Promise.resolve(saveTo(bytes, { token, name, saveAs }));
}

export function renameFile(token: string, name: string): Promise<SavedFile | null> {
	return Promise.resolve({ token, name });
}

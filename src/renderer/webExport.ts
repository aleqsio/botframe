import { bagOf } from "../document/bag";
import type { AgentReply } from "../shared/agent";
import { EXPORT_PAGE_HASH, EXPORT_READY, exportFileNames } from "../shared/exportFile";
import type { ExportScene, ExportedFile } from "../shared/exportFile";
import { download } from "./webFiles";

export type ExportAnswer = { id: number; file: Uint8Array } | { id: number; error: string };

interface Waiter {
	resolve: (file: Uint8Array) => void;
	reject: (error: Error) => void;
}

const NO_FILE = "botframe did not make the file.";
const FRAME_STYLE =
	"position: fixed; left: -10000px; top: 0; width: 1024px; height: 1024px; border: 0; pointer-events: none";

const waiters = new Map<number, Waiter>();
let nextId = 1;
let exportPage: Promise<Window> | null = null;

export function answerOf(value: unknown): ExportAnswer | null {
	const { id, ok, result, error } = bagOf(value);
	if (typeof id !== "number") {
		return null;
	}
	if (ok === true) {
		return result instanceof Uint8Array ? { id, file: result } : { id, error: NO_FILE };
	}
	return ok === false && typeof error === "string" ? { id, error } : null;
}

function settle(value: unknown): void {
	const answer = answerOf(value);
	const waiter = answer === null ? undefined : waiters.get(answer.id);
	if (answer === null || waiter === undefined) {
		return;
	}
	waiters.delete(answer.id);
	if ("file" in answer) {
		waiter.resolve(answer.file);
		return;
	}
	waiter.reject(new Error(answer.error));
}

function fromSameSite(event: MessageEvent, source: Window | null): boolean {
	return source !== null && event.source === source && event.origin === window.location.origin;
}

function openExportPage(): Promise<Window> {
	const frame = document.createElement("iframe");
	frame.src = new URL(`#${EXPORT_PAGE_HASH}`, window.location.href).href;
	frame.tabIndex = -1;
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText = FRAME_STYLE;
	const { promise, resolve } = Promise.withResolvers<Window>();
	window.addEventListener("message", (event) => {
		const page = frame.contentWindow;
		if (page === null || !fromSameSite(event, page)) {
			return;
		}
		if (event.data === EXPORT_READY) {
			resolve(page);
			return;
		}
		settle(event.data);
	});
	document.body.append(frame);
	return promise;
}

export async function renderExport(scene: ExportScene): Promise<Uint8Array> {
	exportPage ??= openExportPage();
	const page = await exportPage;
	const id = nextId;
	nextId += 1;
	return new Promise((resolve, reject) => {
		waiters.set(id, { resolve, reject });
		page.postMessage({ id, args: scene }, window.location.origin);
	});
}

async function replyTo(
	run: (call: unknown) => Promise<AgentReply>,
	call: unknown,
	parent: Window,
): Promise<void> {
	parent.postMessage(await run(call), window.location.origin);
}

export function serveExport(run: (call: unknown) => Promise<AgentReply>): void {
	const { parent } = window;
	if (parent === window) {
		return;
	}
	window.addEventListener("message", (event) => {
		if (!fromSameSite(event, parent)) {
			return;
		}
		void replyTo(run, event.data, parent);
	});
	parent.postMessage(EXPORT_READY, window.location.origin);
}

export function saveExports(files: readonly ExportedFile[]): Promise<number> {
	const names = exportFileNames(files);
	for (const [index, file] of files.entries()) {
		download(file.bytes, names[index] ?? file.name);
	}
	return Promise.resolve(files.length);
}

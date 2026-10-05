import { bagOf } from "../document/bag";
import type { AgentReply } from "../shared/agent";
import { EXPORT_PAGE_HASH, EXPORT_READY, exportFileNames } from "../shared/exportFile";
import type { ExportScene, ExportedFile } from "../shared/exportFile";
import { zipOf } from "./export/zip";
import { download } from "./webFiles";

export type ExportAnswer = { id: number; file: Uint8Array } | { id: number; error: string };

interface Waiter {
	resolve: (file: Uint8Array) => void;
	reject: (error: Error) => void;
}

const NO_FILE = "botframe did not make the file.";
const NO_ANSWER = "The export did not finish. Try again.";
const EXPORT_TIMEOUT = 120_000;
const BUNDLE_NAME = "botframe export.zip";
const FRAME_STYLE =
	"position: fixed; left: -10000px; top: 0; width: 1024px; height: 1024px; border: 0; pointer-events: none";

interface ExportPage {
	window: Promise<Window>;
	close: () => void;
}

const waiters = new Map<number, Waiter>();
let nextId = 1;
let exportPage: ExportPage | null = null;

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

function exportFrame(): HTMLIFrameElement {
	const frame = document.createElement("iframe");
	frame.src = new URL(`#${EXPORT_PAGE_HASH}`, window.location.href).href;
	frame.tabIndex = -1;
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText = FRAME_STYLE;
	return frame;
}

function openExportPage(): ExportPage {
	const frame = exportFrame();
	const listening = new AbortController();
	const { promise, resolve } = Promise.withResolvers<Window>();
	const listen = (event: MessageEvent): void => {
		const page = frame.contentWindow;
		if (page === null || !fromSameSite(event, page)) {
			return;
		}
		if (event.data === EXPORT_READY) {
			resolve(page);
			return;
		}
		settle(event.data);
	};
	window.addEventListener("message", listen, { signal: listening.signal });
	document.body.append(frame);
	const close = (): void => {
		listening.abort();
		frame.remove();
	};
	return { window: promise, close };
}

function closeExportPage(): void {
	exportPage?.close();
	exportPage = null;
	for (const waiter of waiters.values()) {
		waiter.reject(new Error(NO_ANSWER));
	}
	waiters.clear();
}

async function answered(page: Promise<Window>, scene: ExportScene): Promise<Uint8Array> {
	const target = await page;
	const id = nextId;
	nextId += 1;
	return new Promise((resolve, reject) => {
		waiters.set(id, { resolve, reject });
		target.postMessage({ id, args: scene }, window.location.origin);
	});
}

export function renderExport(scene: ExportScene): Promise<Uint8Array> {
	exportPage ??= openExportPage();
	const page = exportPage;
	const { promise, resolve, reject } = Promise.withResolvers<Uint8Array>();
	const timer = setTimeout(() => {
		if (exportPage === page) {
			closeExportPage();
		}
		reject(new Error(NO_ANSWER));
	}, EXPORT_TIMEOUT);
	void answered(page.window, scene)
		.then(resolve, reject)
		.finally(() => {
			clearTimeout(timer);
		});
	return promise;
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

interface Download {
	name: string;
	bytes: Uint8Array;
}

export function downloadsOf(files: readonly ExportedFile[]): readonly Download[] {
	const names = exportFileNames(files);
	const named = files.map((file, index) => ({
		name: names[index] ?? file.name,
		bytes: file.bytes,
	}));
	if (named.length <= 1) {
		return named;
	}
	const entries = named.map((file) => ({ path: file.name, bytes: file.bytes }));
	return [{ name: BUNDLE_NAME, bytes: zipOf(entries) }];
}

export function saveExports(files: readonly ExportedFile[]): Promise<number> {
	for (const file of downloadsOf(files)) {
		download(file.bytes, file.name);
	}
	return Promise.resolve(files.length);
}

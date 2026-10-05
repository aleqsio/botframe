import { BrowserWindow } from "electron";
import type { WebContents } from "electron";
import { EXPORT_PAGE_HASH, EXPORT_SCENE } from "../shared/exportImage";
import { Pending } from "./agent/pending";
import { PAGE_PREFERENCES, loadRenderer } from "./rendererPage";

const TILE_SIZE = 2048;

interface Opened {
	window: BrowserWindow;
	ready: Promise<void>;
	markReady: () => void;
}

function openWindow(): Opened {
	const window = new BrowserWindow({
		width: TILE_SIZE,
		height: TILE_SIZE,
		show: false,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		webPreferences: { ...PAGE_PREFERENCES, offscreen: true },
	});
	const { promise, resolve } = Promise.withResolvers<void>();
	loadRenderer(window, EXPORT_PAGE_HASH);
	return { window, ready: promise, markReady: resolve };
}

export class ExportWindow {
	#opened: Opened | null = null;
	readonly #pending = new Pending((call) => {
		const opened = this.#opened;
		if (opened === null || opened.window.isDestroyed()) {
			throw new Error("The export window is closed.");
		}
		opened.window.webContents.send(EXPORT_SCENE, call);
	});

	async render(scene: unknown): Promise<unknown> {
		await this.#open().ready;
		return this.#pending.call("export", scene);
	}

	owns(contents: WebContents): boolean {
		return this.#opened?.window.webContents === contents;
	}

	markReady(contents: WebContents): void {
		if (this.owns(contents)) {
			this.#opened?.markReady();
		}
	}

	settle(contents: WebContents, reply: unknown): void {
		if (this.owns(contents)) {
			this.#pending.settle(reply);
		}
	}

	close(): void {
		this.#opened?.window.destroy();
		this.#opened = null;
	}

	#open(): Opened {
		if (this.#opened === null || this.#opened.window.isDestroyed()) {
			this.#opened = openWindow();
		}
		return this.#opened;
	}
}

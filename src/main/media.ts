import { ipcMain, net } from "electron";
import { FETCH_MEDIA, MAX_MEDIA_BYTES } from "../shared/media";
import type { FetchedMedia } from "../shared/media";

const WEB_PROTOCOLS = new Set(["https:", "http:"]);
const MEDIA_PREFIXES = ["image/", "video/"];
const FETCH_TIMEOUT_MS = 60_000;

function webUrl(value: unknown): URL | null {
	if (typeof value !== "string" || !URL.canParse(value)) {
		return null;
	}
	const url = new URL(value);
	return WEB_PROTOCOLS.has(url.protocol) ? url : null;
}

function mediaType(response: Response): string | null {
	const [type = ""] = (response.headers.get("content-type") ?? "").split(";");
	const media = type.trim().toLowerCase();
	return MEDIA_PREFIXES.some((prefix) => media.startsWith(prefix)) ? media : null;
}

function joined(chunks: readonly Uint8Array[], size: number): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return bytes;
}

async function cappedBytes(
	body: AsyncIterable<Uint8Array>,
): Promise<Uint8Array<ArrayBuffer> | null> {
	const chunks: Uint8Array[] = [];
	let size = 0;
	for await (const chunk of body) {
		size += chunk.length;
		if (size > MAX_MEDIA_BYTES) {
			return null;
		}
		chunks.push(chunk);
	}
	return joined(chunks, size);
}

async function read(response: Response): Promise<FetchedMedia | null> {
	const type = mediaType(response);
	if (!response.ok || type === null || response.body === null) {
		await response.body?.cancel();
		return null;
	}
	const bytes = await cappedBytes(response.body);
	return bytes === null ? null : { type, bytes };
}

async function fetchMedia(value: unknown): Promise<FetchedMedia | null> {
	const url = webUrl(value);
	if (url === null) {
		return null;
	}
	try {
		return await read(await net.fetch(url.href, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
	} catch {
		return null;
	}
}

export function connectMedia(): void {
	ipcMain.handle(FETCH_MEDIA, (_event, ...args: unknown[]) => fetchMedia(args[0]));
}

import type { LoroDoc, LoroMap } from "loro-crdt";
import { MAX_MEDIA_BYTES } from "../shared/media";
import { bagOf } from "./bag";
import { notify, subscribeTo } from "./listeners";
import type { Unsubscribe } from "./listeners";

declare const ASSET_ID: unique symbol;

export type AssetId = string & { readonly [ASSET_ID]: true };

export type MediaKind = "image" | "video";

const MEDIA_TYPES = {
	"image/png": "image",
	"image/jpeg": "image",
	"image/gif": "image",
	"image/webp": "image",
	"image/avif": "image",
	"video/mp4": "video",
	"video/webm": "video",
} as const satisfies Readonly<Record<string, MediaKind>>;

export type MediaType = keyof typeof MEDIA_TYPES;

export const ACCEPTED_TYPES = Object.keys(MEDIA_TYPES).join(",");

export interface Asset {
	readonly id: AssetId;
	readonly type: MediaType;
	readonly bytes: Uint8Array<ArrayBuffer>;
}

const ASSETS = "assets";
const ASSET_ID_TEXT = /^[0-9a-f]{64}$/u;
const HEX = 16;
const BYTE_DIGITS = 2;

function isMediaType(type: string): type is MediaType {
	return Object.hasOwn(MEDIA_TYPES, type);
}

export function mediaKind(type: MediaType): MediaKind {
	return MEDIA_TYPES[type];
}

export function isAssetId(text: string): text is AssetId {
	return ASSET_ID_TEXT.test(text);
}

async function contentAddress(bytes: Uint8Array<ArrayBuffer>): Promise<AssetId> {
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
	const text = Array.from(digest, (byte) => byte.toString(HEX).padStart(BYTE_DIGITS, "0")).join("");
	if (!isAssetId(text)) {
		throw new Error("the digest is not a content address");
	}
	return text;
}

export function isAcceptedMedia(type: string, size: number): boolean {
	return isMediaType(type) && size > 0 && size <= MAX_MEDIA_BYTES;
}

export async function assetOf(bytes: Uint8Array<ArrayBuffer>, type: string): Promise<Asset | null> {
	if (!isMediaType(type) || !isAcceptedMedia(type, bytes.length)) {
		return null;
	}
	return { id: await contentAddress(bytes), type, bytes };
}

function isBytes(value: unknown): value is Uint8Array<ArrayBuffer> {
	return value instanceof Uint8Array && value.buffer instanceof ArrayBuffer;
}

function storedAsset(id: AssetId, value: unknown): Asset | null {
	const bag = bagOf(value);
	const { bytes, type } = bag;
	if (!isBytes(bytes) || typeof type !== "string" || !isMediaType(type)) {
		return null;
	}
	return { id, type, bytes };
}

export class AssetStore {
	readonly #map: LoroMap;
	readonly #listeners = new Set<() => void>();
	#ids: readonly AssetId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#map = doc.getMap(ASSETS);
		this.#map.subscribe(() => {
			this.#ids = null;
			notify(this.#listeners);
		});
	}

	has(id: AssetId): boolean {
		return this.#map.keys().includes(id);
	}

	put(asset: Asset): void {
		if (!this.has(asset.id)) {
			this.#map.set(asset.id, { type: asset.type, bytes: asset.bytes });
		}
	}

	ids(): readonly AssetId[] {
		if (this.#ids === null) {
			const keys: readonly unknown[] = this.#map.keys();
			this.#ids = keys.filter((key) => typeof key === "string" && isAssetId(key));
		}
		return this.#ids;
	}

	get(id: AssetId): Asset | null {
		return storedAsset(id, this.#map.get(id));
	}

	subscribe(listener: () => void): Unsubscribe {
		return subscribeTo(this.#listeners, listener);
	}
}

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

type MediaType = keyof typeof MEDIA_TYPES;

const FONT_TYPE = "font/woff2";

export type AssetType = MediaType | typeof FONT_TYPE;

export type AssetKind = MediaKind | "font";

export const ACCEPTED_TYPES = Object.keys(MEDIA_TYPES).join(",");

export interface Asset {
	readonly id: AssetId;
	readonly type: AssetType;
	readonly bytes: Uint8Array<ArrayBuffer>;
}

const ASSETS = "assets";
const FONT_FILES = "fontFiles";
const ASSET_ID_TEXT = /^[0-9a-f]{64}$/u;
const HEX = 16;
const BYTE_DIGITS = 2;

function isMediaType(type: string): type is MediaType {
	return Object.hasOwn(MEDIA_TYPES, type);
}

function isAssetType(type: string): type is AssetType {
	return isMediaType(type) || type === FONT_TYPE;
}

export function assetKind(type: AssetType): AssetKind {
	return type === FONT_TYPE ? "font" : MEDIA_TYPES[type];
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

export async function fontAssetOf(bytes: Uint8Array<ArrayBuffer>): Promise<Asset> {
	return { id: await contentAddress(bytes), type: FONT_TYPE, bytes };
}

function isBytes(value: unknown): value is Uint8Array<ArrayBuffer> {
	return value instanceof Uint8Array && value.buffer instanceof ArrayBuffer;
}

function storedAsset(id: AssetId, value: unknown): Asset | null {
	const bag = bagOf(value);
	const { bytes, type } = bag;
	if (!isBytes(bytes) || typeof type !== "string" || !isAssetType(type)) {
		return null;
	}
	return { id, type, bytes };
}

export class AssetStore {
	readonly #media: LoroMap;
	readonly #fonts: LoroMap;
	readonly #listeners = new Set<() => void>();
	#ids: readonly AssetId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#media = doc.getMap(ASSETS);
		this.#fonts = doc.getMap(FONT_FILES);
		const changed = (): void => {
			this.#ids = null;
			notify(this.#listeners);
		};
		this.#media.subscribe(changed);
		this.#fonts.subscribe(changed);
	}

	#mapOf(type: AssetType): LoroMap {
		return type === FONT_TYPE ? this.#fonts : this.#media;
	}

	has(id: AssetId): boolean {
		return this.#media.keys().includes(id) || this.#fonts.keys().includes(id);
	}

	put(asset: Asset): void {
		if (!this.has(asset.id)) {
			this.#mapOf(asset.type).set(asset.id, { type: asset.type, bytes: asset.bytes });
		}
	}

	ids(): readonly AssetId[] {
		if (this.#ids === null) {
			const keys: readonly unknown[] = this.#media.keys();
			this.#ids = keys.filter((key) => typeof key === "string" && isAssetId(key));
		}
		return this.#ids;
	}

	get(id: AssetId): Asset | null {
		return storedAsset(id, this.#media.get(id) ?? this.#fonts.get(id));
	}

	subscribe(listener: () => void): Unsubscribe {
		return subscribeTo(this.#listeners, listener);
	}
}

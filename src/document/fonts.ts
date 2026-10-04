import type { LoroDoc, LoroMap } from "loro-crdt";
import { isAssetId } from "./assets";
import type { Asset, AssetId, AssetStore } from "./assets";
import { bagOf, listOf } from "./bag";
import { KEPT_ORIGIN } from "./history";
import { notify, subscribeTo } from "./listeners";
import type { Unsubscribe } from "./listeners";

export interface FaceShape {
	family: string;
	italic: boolean;
	weight: readonly [number, number];
	unicodeRange: string;
}

export interface StoredFace extends FaceShape {
	asset: AssetId;
}

export interface FontFile {
	asset: Asset;
	face: FaceShape;
}

const FONTS = "fonts";
const UNICODE_RANGE = /^U\+[\dA-F?]+(?:-[\dA-F]+)?(?:,\s*U\+[\dA-F?]+(?:-[\dA-F]+)?)*$/iu;
const KEPT_MESSAGE = "add font";

function weightOf(value: unknown): readonly [number, number] | null {
	const pair = listOf(value);
	const [low, high] = pair;
	if (pair.length !== 2) {
		return null;
	}
	return typeof low === "number" && typeof high === "number" && low <= high ? [low, high] : null;
}

function storedFace(asset: string, value: unknown): StoredFace | null {
	const { family, italic, weight, unicodeRange } = bagOf(value);
	const range = weightOf(weight);
	if (
		!isAssetId(asset) ||
		typeof family !== "string" ||
		typeof italic !== "boolean" ||
		typeof unicodeRange !== "string" ||
		!UNICODE_RANGE.test(unicodeRange) ||
		range === null
	) {
		return null;
	}
	return { asset, family, italic, weight: range, unicodeRange };
}

export class FontStore {
	readonly #doc: LoroDoc;
	readonly #map: LoroMap;
	readonly #assets: AssetStore;
	readonly #waiting: FontFile[] = [];
	readonly #listeners = new Set<() => void>();
	#faces: readonly StoredFace[] | null = null;

	constructor(doc: LoroDoc, assets: AssetStore) {
		this.#doc = doc;
		this.#map = doc.getMap(FONTS);
		this.#assets = assets;
		this.#map.subscribe(() => {
			this.#faces = null;
			notify(this.#listeners);
		});
	}

	faces(): readonly StoredFace[] {
		this.#faces ??= [
			...Object.entries(bagOf(this.#map.toJSON())).flatMap(
				([asset, value]) => storedFace(asset, value) ?? [],
			),
			...this.#waiting.map(({ asset, face }) => ({ ...face, asset: asset.id })),
		];
		return this.#faces;
	}

	fileOf(id: AssetId): Asset | null {
		return this.#waiting.find(({ asset }) => asset.id === id)?.asset ?? this.#assets.get(id);
	}

	covers(family: string, italic: boolean, weight: number): boolean {
		return this.faces().some(
			(face) =>
				face.family === family &&
				face.italic === italic &&
				face.weight[0] <= weight &&
				weight <= face.weight[1],
		);
	}

	add(files: readonly FontFile[]): void {
		this.#waiting.push(...files);
		this.#faces = null;
		notify(this.#listeners);
		if (this.#doc.getPendingTxnLength() === 0) {
			this.writeWaiting();
		}
	}

	writeWaiting(): void {
		const files = this.#waiting
			.splice(0)
			.filter(({ asset }) => this.#map.get(asset.id) === undefined);
		for (const { asset, face } of files) {
			this.#assets.put(asset);
			this.#map.set(asset.id, { ...face, weight: [...face.weight] });
		}
		if (files.length > 0) {
			this.#doc.commit({ origin: KEPT_ORIGIN, message: KEPT_MESSAGE });
		}
	}

	subscribe(listener: () => void): Unsubscribe {
		return subscribeTo(this.#listeners, listener);
	}
}

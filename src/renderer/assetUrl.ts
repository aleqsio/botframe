import { useCallback, useSyncExternalStore } from "react";
import { mediaKind } from "../document/assets";
import type { AssetId, AssetStore, MediaKind } from "../document/assets";

export interface AssetUrl {
	kind: MediaKind;
	url: string;
}

const URLS = new Map<AssetId, AssetUrl>();

function assetUrl(store: AssetStore, id: AssetId): AssetUrl | null {
	const cached = URLS.get(id);
	if (cached !== undefined) {
		return cached;
	}
	const asset = store.get(id);
	if (asset === null) {
		return null;
	}
	const blob = new Blob([asset.bytes], { type: asset.type });
	const made = { kind: mediaKind(asset.type), url: URL.createObjectURL(blob) };
	URLS.set(id, made);
	return made;
}

export function useAssetUrl(store: AssetStore, id: AssetId | null): AssetUrl | null {
	return useSyncExternalStore(
		useCallback((listener: () => void) => store.subscribe(listener), [store]),
		useCallback(() => (id === null ? null : assetUrl(store, id)), [store, id]),
	);
}

export function useAssetIds(store: AssetStore): readonly AssetId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => store.subscribe(listener), [store]),
		useCallback(() => store.ids(), [store]),
	);
}

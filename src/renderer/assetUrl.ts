import { useCallback, useSyncExternalStore } from "react";
import { assetKind } from "../document/assets";
import type { Asset, AssetId, AssetKind, AssetStore } from "../document/assets";

export interface AssetUrl {
	kind: AssetKind;
	url: string;
}

const URLS = new Map<AssetId, AssetUrl>();

export function assetUrlOf(read: (id: AssetId) => Asset | null, id: AssetId): AssetUrl | null {
	const cached = URLS.get(id);
	if (cached !== undefined) {
		return cached;
	}
	const asset = read(id);
	if (asset === null) {
		return null;
	}
	const blob = new Blob([asset.bytes], { type: asset.type });
	const made = { kind: assetKind(asset.type), url: URL.createObjectURL(blob) };
	URLS.set(id, made);
	return made;
}

export function useAssetUrl(store: AssetStore, id: AssetId | null): AssetUrl | null {
	return useSyncExternalStore(
		useCallback((listener: () => void) => store.subscribe(listener), [store]),
		useCallback(
			() => (id === null ? null : assetUrlOf((held) => store.get(held), id)),
			[store, id],
		),
	);
}

export function useAssetIds(store: AssetStore): readonly AssetId[] {
	return useSyncExternalStore(
		useCallback((listener: () => void) => store.subscribe(listener), [store]),
		useCallback(() => store.ids(), [store]),
	);
}

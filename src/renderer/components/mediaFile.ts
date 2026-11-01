import { assetOf, isAcceptedMedia, assetKind } from "../../document/assets";
import type { Asset } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { DEFAULT_PLAYBACK } from "../../document/media";
import type { MediaFit } from "../../document/media";
import { bridge } from "../bridge";

export const MEDIA_MESSAGE = "set media";
const ADD_MEDIA_MESSAGE = "add media";

function keptFit(layer: Layer, asset: Asset): MediaFit {
	const fit = layer.media?.fit ?? "cover";
	return fit === "tile" && assetKind(asset.type) === "video" ? "cover" : fit;
}

export function placeAsset(doc: DesignDocument, layers: readonly Layer[], asset: Asset): void {
	for (const layer of layers) {
		doc.update(layer.id, {
			media: {
				...DEFAULT_PLAYBACK,
				stack: "over",
				...layer.media,
				asset: asset.id,
				fit: keptFit(layer, asset),
			},
		});
	}
	doc.commit(MEDIA_MESSAGE);
}

export async function fileAsset(file: File): Promise<Asset | null> {
	return isAcceptedMedia(file.type, file.size)
		? assetOf(new Uint8Array(await file.arrayBuffer()), file.type)
		: null;
}

export async function placeMediaFile(doc: DesignDocument, layer: Layer, file: File): Promise<void> {
	const asset = await fileAsset(file);
	if (asset === null || doc.layer(layer.id) === null) {
		return;
	}
	doc.assets.put(asset);
	placeAsset(doc, [layer], asset);
}

function addAsset(doc: DesignDocument, asset: Asset | null): boolean {
	if (asset === null) {
		return false;
	}
	doc.assets.put(asset);
	doc.commit(ADD_MEDIA_MESSAGE);
	return true;
}

export async function addMediaFile(doc: DesignDocument, file: File): Promise<boolean> {
	return addAsset(doc, await fileAsset(file));
}

export async function urlAsset(url: string): Promise<Asset | null> {
	const media = await bridge().fetchMedia(url);
	return media === null ? null : assetOf(media.bytes, media.type);
}

export async function addMediaUrl(doc: DesignDocument, url: string): Promise<boolean> {
	return addAsset(doc, await urlAsset(url));
}

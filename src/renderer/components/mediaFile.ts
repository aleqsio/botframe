import { assetOf, isAcceptedMedia, mediaKind } from "../../document/assets";
import type { Asset } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { MediaFit } from "../../document/media";

export const MEDIA_MESSAGE = "set media";

function keptFit(layer: Layer, asset: Asset): MediaFit {
	const fit = layer.media?.fit ?? "cover";
	return fit === "tile" && mediaKind(asset.type) === "video" ? "cover" : fit;
}

export function placeAsset(doc: DesignDocument, layer: Layer, asset: Asset): void {
	doc.update(layer.id, { media: { asset: asset.id, fit: keptFit(layer, asset) } });
	doc.commit(MEDIA_MESSAGE);
}

export async function placeMediaFile(doc: DesignDocument, layer: Layer, file: File): Promise<void> {
	if (!isAcceptedMedia(file.type, file.size)) {
		return;
	}
	const asset = await assetOf(new Uint8Array(await file.arrayBuffer()), file.type);
	if (asset === null || doc.layer(layer.id) === null) {
		return;
	}
	doc.assets.put(asset);
	placeAsset(doc, layer, asset);
}

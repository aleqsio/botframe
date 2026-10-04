import { useCallback, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer } from "../document/layer";
import type { DisplayMode } from "../document/layout";
import { useAssetUrl } from "./assetUrl";
import type { AssetUrl } from "./assetUrl";
import { clipLinkIds, layerClipShape, withLayerClip } from "./layerClip";
import { layerStyle } from "./layerStyle";
import { useClipTargets } from "./useDocument";
import { paintedStyle } from "./mediaStyle";

export interface LayerPaintStyle {
	style: CSSProperties | null;
	media: AssetUrl | null;
}

const NO_SUBSCRIPTION = (): void => {};

function subscribeLinks(doc: DesignDocument, layer: Layer, listener: () => void): () => void {
	if (layer.clipLayer === null) {
		return NO_SUBSCRIPTION;
	}
	const links = clipLinkIds((id) => doc.layer(id), layer);
	const drops = [
		doc.subscribeClips(listener),
		doc.subscribeStructure(listener),
		...links.map((id) => doc.subscribeLayer(id, listener)),
	];
	return () => {
		for (const drop of drops) {
			drop();
		}
	};
}

function useClipShape(doc: DesignDocument, layer: Layer | null): string | undefined {
	return useSyncExternalStore(
		useCallback(
			(listener: () => void) =>
				layer === null ? NO_SUBSCRIPTION : subscribeLinks(doc, layer, listener),
			[doc, layer],
		),
		useCallback(
			() => (layer === null ? undefined : layerClipShape((id) => doc.layer(id), layer)),
			[doc, layer],
		),
	);
}

export function useLayerPaint(
	doc: DesignDocument,
	layer: Layer | null,
	parentDisplay: DisplayMode | null,
): LayerPaintStyle {
	const media = useAssetUrl(doc.assets, layer?.media?.asset ?? null);
	const shape = useClipShape(doc, layer);
	const source = useClipTargets(doc, layer?.id ?? null).length > 0;
	if (layer === null) {
		return { style: null, media };
	}
	const painted = paintedStyle(layerStyle(layer, parentDisplay), layer.media?.fit ?? null, media);
	return { style: withLayerClip(painted, shape, source), media };
}

import type { ReactElement } from "react";
import type { Layer } from "../document/layer";
import type { AssetUrl } from "./assetUrl";
import { LayerVideo } from "./LayerVideo";
import { pathPaintStyle } from "./layerStyle";
import { paintedStyle } from "./mediaStyle";

export function LayerPaint({
	layer,
	media,
}: {
	layer: Layer;
	media: AssetUrl | null;
}): ReactElement {
	const fit = layer.media?.fit ?? null;
	const paint = pathPaintStyle(layer);

	if (paint === null) {
		return <LayerVideo fit={fit} media={media} />;
	}

	return (
		<span className="layer-paint" data-layer-id={layer.id} style={paintedStyle(paint, fit, media)}>
			<LayerVideo fit={fit} media={media} />
		</span>
	);
}

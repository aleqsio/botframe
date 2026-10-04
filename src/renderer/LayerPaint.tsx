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
	const paint = pathPaintStyle(layer);

	if (paint === null) {
		return <LayerVideo fill={layer.media} media={media} paint={layer.fill} />;
	}

	return (
		<span
			className="layer-paint"
			data-layer-id={layer.id}
			style={paintedStyle(paint, layer.media, media)}
		>
			<LayerVideo fill={layer.media} media={media} paint={layer.fill} />
		</span>
	);
}

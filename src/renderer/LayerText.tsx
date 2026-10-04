import type { ReactElement } from "react";
import type { Layer } from "../document/layer";
import type { TextGeometry } from "../document/text";
import type { AssetUrl } from "./assetUrl";
import { paintedStyle } from "./mediaStyle";
import { textPaintStyle } from "./textStyle";

export function LayerText({
	geometry,
	layer,
	media,
}: {
	geometry: TextGeometry;
	layer: Layer;
	media: AssetUrl | null;
}): ReactElement {
	const paint = textPaintStyle(paintedStyle({ background: layer.fill }, layer.media, media));

	// React sets only the changed `background` shorthand, and the browser then resets `background-clip`. A new element for each paint keeps the clip.
	// https://github.com/facebook/react/issues/6348
	return (
		<span
			className="layer-text"
			data-layer-id={layer.id}
			key={String(paint.background)}
			style={paint}
		>
			{geometry.content}
		</span>
	);
}

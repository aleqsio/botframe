import type { ReactElement } from "react";
import type { MediaFit } from "../document/media";
import type { AssetUrl } from "./assetUrl";
import { videoStyle } from "./mediaStyle";

export function LayerVideo({
	fit,
	media,
}: {
	fit: MediaFit | null;
	media: AssetUrl | null;
}): ReactElement | null {
	if (fit === null || media?.kind !== "video") {
		return null;
	}

	return (
		<video
			autoPlay
			className="layer-media"
			loop
			muted
			playsInline
			src={media.url}
			style={videoStyle(fit)}
		/>
	);
}

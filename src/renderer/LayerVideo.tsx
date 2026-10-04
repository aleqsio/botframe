import type { ReactElement } from "react";
import type { MediaFill } from "../document/media";
import type { AssetUrl } from "./assetUrl";
import { videoStyle } from "./mediaStyle";

export function LayerVideo({
	fill,
	media,
	paint,
}: {
	fill: MediaFill | null;
	media: AssetUrl | null;
	paint: string;
}): ReactElement | null {
	if (fill === null || media?.kind !== "video") {
		return null;
	}

	return (
		<>
			<video
				autoPlay
				className="layer-media"
				loop
				muted
				playsInline
				src={media.url}
				style={videoStyle(fill.fit)}
			/>
			{fill.stack === "under" ? (
				<span className="layer-media" style={{ background: paint }} />
			) : null}
		</>
	);
}

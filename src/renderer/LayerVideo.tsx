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
				autoPlay={fill.autoplay}
				className="layer-media"
				controls={fill.controls}
				loop={fill.loop}
				muted={fill.muted}
				playsInline
				key={String(fill.autoplay)}
				ref={(video) => {
					if (video !== null) {
						video.defaultMuted = fill.muted;
					}
				}}
				src={media.url}
				style={videoStyle(fill.fit)}
			>
				<track kind="captions" />
			</video>
			{fill.stack === "under" ? (
				<span className="layer-media" style={{ background: paint }} />
			) : null}
		</>
	);
}

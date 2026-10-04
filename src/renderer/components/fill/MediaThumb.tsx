import type { ReactElement } from "react";
import type { AssetStore, AssetId } from "../../../document/assets";
import { useAssetUrl } from "../../assetUrl";

export const KIND_LABELS = { image: "Image", video: "Video", font: "Font" } as const;

export function MediaThumb({ asset, store }: { asset: AssetId; store: AssetStore }): ReactElement {
	const media = useAssetUrl(store, asset);
	if (media?.kind === "video") {
		return <video className="media-thumb" muted playsInline preload="metadata" src={media.url} />;
	}
	return (
		<span
			className="media-thumb"
			style={{ backgroundImage: media === null ? undefined : `url("${media.url}")` }}
		/>
	);
}

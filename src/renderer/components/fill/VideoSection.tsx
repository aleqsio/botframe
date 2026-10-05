import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import type { MediaFill, PlaybackKey } from "../../../document/media";
import { useAssetUrl } from "../../assetUrl";

const PLAYBACK_MESSAGE = "set video playback";

const PLAYBACK_ROWS: readonly (readonly [PlaybackKey, PlaybackKey])[] = [
	["autoplay", "loop"],
	["muted", "controls"],
];

const PLAYBACK_LABELS: Readonly<Record<PlaybackKey, string>> = {
	autoplay: "Autoplay",
	loop: "Loop",
	muted: "Muted",
	controls: "Controls",
};

interface VideoProps {
	doc: DesignDocument;
	layer: Layer;
	media: MediaFill;
}

function PlaybackFlag({
	doc,
	layer,
	media,
	flag,
}: VideoProps & { flag: PlaybackKey }): ReactElement {
	return (
		<button
			aria-pressed={media[flag]}
			className="layout-flag"
			data-changed={isChanged(layer, "media") ? "" : undefined}
			onClick={() => {
				doc.update(layer.id, { media: { ...media, [flag]: !media[flag] } });
				doc.commit(PLAYBACK_MESSAGE);
			}}
			type="button"
		>
			{PLAYBACK_LABELS[flag]}
		</button>
	);
}

function PlaybackFlags(props: VideoProps): ReactElement {
	return (
		<section aria-label="Video" className="field-group layout-section">
			<span className="group-label">Video</span>
			{PLAYBACK_ROWS.map((row) => (
				<div className="chip-row" key={row[0]}>
					{row.map((flag) => (
						<PlaybackFlag {...props} flag={flag} key={flag} />
					))}
				</div>
			))}
		</section>
	);
}

export function VideoSection({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement | null {
	const { media } = layer;
	const kind = useAssetUrl(doc.assets, media?.asset ?? null)?.kind;
	if (media === null || kind !== "video") {
		return null;
	}
	return <PlaybackFlags doc={doc} layer={layer} media={media} />;
}

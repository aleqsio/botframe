import { useRef } from "react";
import type { ReactElement } from "react";
import { ACCEPTED_TYPES } from "../../document/assets";
import type { DesignDocument } from "../../document/document";
import { isChanged } from "../../document/layer";
import type { Layer } from "../../document/layer";
import type { MediaFill, MediaFit } from "../../document/media";
import { useAssetUrl } from "../assetUrl";
import { Icon } from "./Icon";
import { Segmented } from "./layout/Segmented";
import type { SegmentOption } from "./layout/Segmented";
import { MEDIA_MESSAGE, placeMediaFile } from "./mediaFile";

function fitOptions(video: boolean): readonly SegmentOption<MediaFit>[] {
	return [
		{ value: "cover", label: "Fill" },
		{ value: "contain", label: "Fit" },
		{ value: "stretch", label: "Stretch" },
		{ value: "tile", label: "Tile", disabled: video },
	];
}

function FitRow({
	doc,
	layer,
	media,
}: {
	doc: DesignDocument;
	layer: Layer;
	media: MediaFill;
}): ReactElement {
	const video = useAssetUrl(doc.assets, media.asset)?.kind === "video";

	return (
		<Segmented
			changed={isChanged(layer, "media")}
			label="Media fit"
			onPick={(fit) => {
				doc.update(layer.id, { media: { ...media, fit } });
				doc.commit(MEDIA_MESSAGE);
			}}
			options={fitOptions(video)}
			value={media.fit}
		/>
	);
}

export function MediaField({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const input = useRef<HTMLInputElement>(null);

	return (
		<div className="field-group layout-section">
			<span className="group-label">Media</span>
			<div className="guide-row">
				<input
					accept={ACCEPTED_TYPES}
					aria-label="Media file"
					hidden
					onChange={(event) => {
						const [file] = event.target.files ?? [];
						event.target.value = "";
						if (file !== undefined) {
							void placeMediaFile(doc, layer, file);
						}
					}}
					ref={input}
					type="file"
				/>
				<button
					className="guide-button guide-add"
					onClick={() => {
						input.current?.click();
					}}
					type="button"
				>
					<Icon name="image" />
					Choose file
				</button>
				<button
					aria-label="Remove media"
					className="guide-button"
					disabled={layer.media === null}
					onClick={() => {
						doc.update(layer.id, { media: null });
						doc.commit(MEDIA_MESSAGE);
					}}
					type="button"
				>
					<Icon name="minus" />
				</button>
			</div>
			{layer.media === null ? null : <FitRow doc={doc} layer={layer} media={layer.media} />}
		</div>
	);
}

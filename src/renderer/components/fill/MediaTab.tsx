import { useRef } from "react";
import type { ReactElement } from "react";
import { MediaFileInput } from "./MediaFileInput";
import type { AssetId } from "../../../document/assets";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import type { MediaFill, MediaFit } from "../../../document/media";
import { useAssetIds, useAssetUrl } from "../../assetUrl";
import { Icon } from "../Icon";
import { Segmented } from "../layout/Segmented";
import type { SegmentOption } from "../layout/Segmented";
import { MEDIA_MESSAGE, placeAsset, placeMediaFile } from "../mediaFile";
import { MediaThumb } from "./MediaThumb";

interface TabProps {
	doc: DesignDocument;
	layer: Layer;
}

export const FIT_LABELS: Readonly<Record<MediaFit, string>> = {
	cover: "Fill",
	contain: "Fit",
	stretch: "Stretch",
	tile: "Tile",
};

function fitOptions(video: boolean): readonly SegmentOption<MediaFit>[] {
	return [
		{ value: "cover", label: FIT_LABELS.cover },
		{ value: "contain", label: FIT_LABELS.contain },
		{ value: "stretch", label: FIT_LABELS.stretch },
		{ value: "tile", label: FIT_LABELS.tile, disabled: video },
	];
}

function FitRow({ doc, layer, media }: TabProps & { media: MediaFill }): ReactElement {
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

function ChooseFile({ doc, layer }: TabProps): ReactElement {
	const input = useRef<HTMLInputElement>(null);

	return (
		<div className="guide-row">
			<MediaFileInput
				onFile={(file) => {
					void placeMediaFile(doc, layer, file);
				}}
				ref={input}
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
		</div>
	);
}

function AssetTile({ doc, id, layer }: TabProps & { id: AssetId }): ReactElement {
	const kind = useAssetUrl(doc.assets, id)?.kind ?? "image";
	return (
		<button
			aria-label={`Use this ${kind}`}
			aria-pressed={layer.media?.asset === id}
			className="media-tile"
			onClick={() => {
				const asset = doc.assets.get(id);
				if (asset !== null) {
					placeAsset(doc, [layer], asset);
				}
			}}
			type="button"
		>
			<MediaThumb asset={id} store={doc.assets} />
		</button>
	);
}

function DocumentMedia({ doc, layer }: TabProps): ReactElement | null {
	const ids = useAssetIds(doc.assets);
	if (ids.length === 0) {
		return null;
	}
	return (
		<div className="fill-part">
			<span className="layout-sub">Document media</span>
			<div className="media-grid">
				{ids.map((id) => (
					<AssetTile doc={doc} id={id} key={id} layer={layer} />
				))}
			</div>
		</div>
	);
}

export function MediaTab({ doc, layer }: TabProps): ReactElement {
	const { media } = layer;
	return (
		<>
			{media === null ? null : (
				<div className="media-preview">
					<MediaThumb asset={media.asset} store={doc.assets} />
				</div>
			)}
			<ChooseFile doc={doc} layer={layer} />
			{media === null ? null : <FitRow doc={doc} layer={layer} media={media} />}
			<DocumentMedia doc={doc} layer={layer} />
		</>
	);
}

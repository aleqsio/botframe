import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import type { MediaFill } from "../../../document/media";
import { useAssetUrl } from "../../assetUrl";
import { MEDIA_MESSAGE } from "../mediaFile";
import type { RowDrag } from "./fillOrder";
import { IconButton } from "./IconButton";
import { FIT_LABELS } from "./MediaTab";
import { KIND_LABELS, MediaThumb } from "./MediaThumb";

interface RowProps {
	doc: DesignDocument;
	layer: Layer;
	onOpen: () => void;
	drag: RowDrag;
}

export function MediaRow({
	doc,
	layer,
	media,
	onOpen,
	drag,
}: RowProps & { media: MediaFill }): ReactElement {
	const kind = useAssetUrl(doc.assets, media.asset)?.kind ?? "image";
	return (
		<div
			{...drag}
			className="property-field fill-row"
			data-changed={isChanged(layer, "media") ? "" : undefined}
		>
			<button
				aria-label="Media picker"
				className="color-swatch"
				data-opens=""
				onClick={onOpen}
				type="button"
			>
				<MediaThumb asset={media.asset} store={doc.assets} />
			</button>
			<button className="fill-name" data-opens="" onClick={onOpen} type="button">
				{`${KIND_LABELS[kind]} · ${FIT_LABELS[media.fit]}`}
			</button>
			<IconButton
				icon="minus"
				label="Remove media"
				onClick={() => {
					doc.update(layer.id, { media: null });
					doc.commit(MEDIA_MESSAGE);
				}}
			/>
			<span aria-hidden="true" className="bind-slot" />
		</div>
	);
}

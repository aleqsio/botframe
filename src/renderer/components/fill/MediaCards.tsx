import type { ReactElement } from "react";
import type { AssetId } from "../../../document/assets";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerId } from "../../../document/layer";
import { useAssetIds, useAssetUrl } from "../../assetUrl";
import { placeAsset } from "../mediaFile";
import { MediaThumb } from "./MediaThumb";

const KIND_LABELS = { image: "Image", video: "Video" } as const;

interface MediaProps {
	doc: DesignDocument;
	selection: readonly LayerId[];
}

function MediaCard({ doc, id, selection }: MediaProps & { id: AssetId }): ReactElement {
	const label = KIND_LABELS[useAssetUrl(doc.assets, id)?.kind ?? "image"];
	return (
		<li className="fill-card">
			<button
				aria-label={`Use this ${label.toLowerCase()}`}
				className="fill-card-button"
				onClick={() => {
					const asset = doc.assets.get(id);
					const layers = selection.flatMap((held): Layer[] => {
						const layer = doc.layer(held);
						return layer === null ? [] : [layer];
					});
					if (asset !== null && layers.length > 0) {
						placeAsset(doc, layers, asset);
					}
				}}
				type="button"
			>
				<span className="fill-card-preview">
					<MediaThumb asset={id} store={doc.assets} />
				</span>
				<span className="fill-card-name">{label}</span>
			</button>
		</li>
	);
}

export function MediaCards({ doc, selection }: MediaProps): ReactElement {
	const ids = useAssetIds(doc.assets);
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">Media</span>
			</div>
			{ids.length === 0 ? (
				<p className="component-note">No media. Choose a file in the fill picker.</p>
			) : (
				<ul className="fill-cards">
					{ids.map((id) => (
						<MediaCard doc={doc} id={id} key={id} selection={selection} />
					))}
				</ul>
			)}
		</div>
	);
}

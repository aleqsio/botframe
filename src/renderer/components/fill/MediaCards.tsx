import { useState } from "react";
import type { ReactElement } from "react";
import { ACCEPTED_TYPES } from "../../../document/assets";
import type { AssetId, AssetKind } from "../../../document/assets";
import type { DesignDocument } from "../../../document/document";
import { useAssetIds, useAssetUrl } from "../../assetUrl";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { addMediaFile } from "../mediaFile";
import { AddMenu } from "../variables/AddMenu";
import { KIND_LABELS, MediaThumb } from "./MediaThumb";
import { UrlCard, UrlField, mediaChoices, useUrlLoads } from "./MediaUrl";

const KIND_ICONS: Readonly<Record<AssetKind, IconName>> = {
	image: "image",
	video: "video",
	font: "text",
};

function MediaCard({ doc, id }: { doc: DesignDocument; id: AssetId }): ReactElement {
	const kind = useAssetUrl(doc.assets, id)?.kind ?? "image";
	return (
		<li className="fill-card fill-card-static" title={KIND_LABELS[kind]}>
			<span className="fill-card-preview">
				<MediaThumb asset={id} store={doc.assets} />
				<span className="media-badge">
					<Icon name={KIND_ICONS[kind]} />
				</span>
			</span>
		</li>
	);
}

function FileInput({
	doc,
	input,
}: {
	doc: DesignDocument;
	input: (element: HTMLInputElement | null) => void;
}): ReactElement {
	return (
		<input
			accept={ACCEPTED_TYPES}
			aria-label="Upload to the document media"
			hidden
			onChange={(event) => {
				const [file] = event.target.files ?? [];
				event.target.value = "";
				if (file !== undefined) {
					void addMediaFile(doc, file);
				}
			}}
			ref={input}
			type="file"
		/>
	);
}

export function MediaCards({ doc }: { doc: DesignDocument }): ReactElement {
	const ids = useAssetIds(doc.assets);
	const [typing, setTyping] = useState(false);
	const urls = useUrlLoads(doc);
	const [input, setInput] = useState<HTMLInputElement | null>(null);
	const choices = mediaChoices(
		() => {
			setTyping(true);
		},
		() => {
			input?.click();
		},
	);
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">Media</span>
				<AddMenu choices={choices} compact label="Add media" />
				<FileInput doc={doc} input={setInput} />
			</div>
			{typing ? (
				<UrlField
					onClose={() => {
						setTyping(false);
					}}
					onSubmit={urls.start}
				/>
			) : null}
			{ids.length === 0 && urls.loads.length === 0 ? (
				<p className="fill-group-note">No media.</p>
			) : (
				<ul className="fill-cards">
					{ids.map((id) => (
						<MediaCard doc={doc} id={id} key={id} />
					))}
					{urls.loads.map((load) => (
						<UrlCard key={load.key} load={load} onDismiss={urls.dismiss} />
					))}
				</ul>
			)}
		</div>
	);
}

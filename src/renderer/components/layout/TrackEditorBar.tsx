import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { TrackBar } from "./TrackBar";
import { FRACTION, removeTrack, setTrack, trackList, writeTracks } from "./tracks";
import type { TrackEdit } from "./tracks";

export function TrackEditorBar({
	doc,
	edit,
	layer,
	onClose,
}: {
	doc: DesignDocument;
	edit: TrackEdit;
	layer: Layer;
	onClose: () => void;
}): ReactElement {
	const list = trackList(layer.layout.tracks, edit.axis);

	return (
		<TrackBar
			axis={edit.axis}
			count={list.length}
			index={edit.index}
			onChange={(track) => {
				writeTracks(doc, layer, edit.axis, setTrack(list, edit.index, track));
			}}
			onRemove={() => {
				writeTracks(doc, layer, edit.axis, removeTrack(list, edit.index));
				onClose();
			}}
			track={list[edit.index] ?? FRACTION}
		/>
	);
}

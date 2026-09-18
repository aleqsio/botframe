import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { TRACK_UNITS } from "../../../document/layout";
import { LengthField } from "./LengthField";
import {
	FRACTION,
	TRACK_WORD,
	removeTrack,
	setTrack,
	trackLabel,
	trackList,
	trackMeasure,
	trackOf,
	writeTracks,
} from "./tracks";
import type { TrackEdit } from "./tracks";

const RESET_TIP = "Reset to 1fr";

export function TrackBar({
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
	const tip = list.length < 2 ? RESET_TIP : `Remove ${TRACK_WORD[edit.axis].toLowerCase()}`;

	return (
		<div className="layout-tbar">
			<LengthField
				label={trackLabel(edit.axis, edit.index)}
				onChange={(next) => {
					writeTracks(doc, layer, edit.axis, setTrack(list, edit.index, trackOf(next)));
				}}
				units={TRACK_UNITS}
				value={trackMeasure(list[edit.index] ?? FRACTION)}
			/>
			<button
				aria-label={tip}
				className="layout-tminus"
				onClick={() => {
					writeTracks(doc, layer, edit.axis, removeTrack(list, edit.index));
					onClose();
				}}
				title={tip}
				type="button"
			>
				−
			</button>
		</div>
	);
}

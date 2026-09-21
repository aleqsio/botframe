import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { TRACK_UNITS } from "../../../document/layout";
import { useTargets } from "../targets";
import { LengthField } from "./LengthField";
import {
	FRACTION,
	TRACK_WORD,
	commitTracks,
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
const TRACK_MIN = 0;

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
	const targets = useTargets();
	const list = trackList(layer.layout.tracks, edit.axis);
	const tip = list.length < 2 ? RESET_TIP : `Remove ${TRACK_WORD[edit.axis].toLowerCase()}`;
	const word = trackLabel(edit.axis, edit.index);

	return (
		<div className="layout-tbar">
			<LengthField
				label={word}
				min={TRACK_MIN}
				onChange={(next) => {
					writeTracks(doc, targets, edit.axis, setTrack(list, edit.index, trackOf(next)));
				}}
				onCommit={() => {
					commitTracks(doc);
				}}
				text={word}
				units={TRACK_UNITS}
				value={trackMeasure(list[edit.index] ?? FRACTION)}
			/>
			<button
				aria-label={tip}
				className="layout-tminus"
				onClick={() => {
					writeTracks(doc, targets, edit.axis, removeTrack(list, edit.index));
					commitTracks(doc);
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

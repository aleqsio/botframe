import type { ReactElement } from "react";
import { TRACK_UNITS } from "../../../document/layout";
import type { Track } from "../../../document/layout";
import { LengthField } from "./LengthField";
import { TRACK_WORD, trackLabel, trackMeasure, trackOf } from "./tracks";
import type { TrackAxis } from "./tracks";

const RESET_TIP = "Reset to 1fr";

export function TrackBar({
	axis,
	count,
	index,
	onChange,
	onRemove,
	track,
}: {
	axis: TrackAxis;
	count: number;
	index: number;
	onChange: (track: Track) => void;
	onRemove: () => void;
	track: Track;
}): ReactElement {
	const label = trackLabel(axis, index);
	const tip = count < 2 ? RESET_TIP : `Remove ${TRACK_WORD[axis].toLowerCase()}`;

	return (
		<div className="layout-tbar">
			<LengthField
				label={label}
				onChange={(next) => {
					onChange(trackOf(next));
				}}
				units={TRACK_UNITS}
				value={trackMeasure(track)}
			/>
			<button
				aria-label={tip}
				className="layout-tminus"
				onClick={onRemove}
				title={tip}
				type="button"
			>
				−
			</button>
		</div>
	);
}

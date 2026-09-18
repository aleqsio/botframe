import type { CSSProperties, ReactElement } from "react";
import type { Track } from "../../../document/layout";
import { trackText } from "../../layerStyle";
import { trackLabel } from "./tracks";
import type { TrackAxis } from "./tracks";

export function TrackChips({
	axis,
	onOpen,
	open,
	template,
	tracks,
}: {
	axis: TrackAxis;
	onOpen: (index: number) => void;
	open: number | null;
	template: CSSProperties;
	tracks: readonly Track[];
}): ReactElement {
	return (
		<div className={`layout-chips layout-chips-${axis}`} style={template}>
			{tracks.map((track, index) => (
				<button
					aria-label={`${trackLabel(axis, index)}, ${trackText(track)}`}
					aria-pressed={index === open}
					className="layout-tchip"
					key={trackLabel(axis, index)}
					onClick={() => {
						onOpen(index);
					}}
					title={trackLabel(axis, index)}
					type="button"
				>
					{trackText(track)}
				</button>
			))}
		</div>
	);
}

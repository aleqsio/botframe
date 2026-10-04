import type { ReactElement } from "react";
import type { Gradient } from "../../../document/paint";
import { slotsOf } from "../variables/reach";
import { DraftInput } from "../PropertyField";
import { formatColor } from "../color";
import { colorOf } from "../cssColor";
import { numberIn } from "../numberValue";
import { IconButton } from "./IconButton";
import { percentText } from "./GradientBar";
import type { StopPick } from "./GradientBar";
import { stopAdded, stopMoved, stopRecolored, stopRemoved } from "./stops";

const PERCENT = 100;
const MIN_STOPS = 2;
const MIDDLE = 0.5;

interface ListProps extends StopPick {
	onSet: (gradient: Gradient) => void;
}

function StopRow({
	gradient,
	index,
	onSelect,
	onSet,
	selected,
}: ListProps & { index: number }): ReactElement | null {
	const stop = gradient.stops[index];
	if (stop === undefined) {
		return null;
	}
	const name = `Stop ${index + 1}`;
	return (
		<div
			className="stop-row"
			data-selected={index === selected ? "" : undefined}
			onFocus={() => {
				onSelect(index);
			}}
		>
			<DraftInput
				inputMode="numeric"
				label={`${name} position`}
				onCommit={(text) => {
					const percent = numberIn(text);
					if (percent !== null) {
						const moved = stopMoved(gradient, index, percent / PERCENT);
						onSelect(moved.index);
						onSet(moved.gradient);
					}
				}}
				value={percentText(stop.position)}
			/>
			<span className="color-swatch">
				<span className="color-swatch-fill" style={{ background: stop.color }} />
			</span>
			<DraftInput
				inputMode="text"
				label={`${name} color`}
				onCommit={(text) => {
					const color = colorOf(text);
					if (color !== null) {
						onSet(stopRecolored(gradient, index, formatColor(color)));
					}
				}}
				value={stop.color}
			/>
			<IconButton
				disabled={gradient.stops.length <= MIN_STOPS}
				icon="minus"
				label={`Remove ${name.toLowerCase()}`}
				onClick={() => {
					onSelect(0);
					onSet(stopRemoved(gradient, index));
				}}
			/>
		</div>
	);
}

export function StopList(props: ListProps): ReactElement {
	const { gradient, onSelect, onSet } = props;
	return (
		<div className="fill-part">
			<div className="fill-part-head">
				<span className="layout-sub">Stops</span>
				<IconButton
					icon="plus"
					label="Add stop"
					onClick={() => {
						const added = stopAdded(gradient, MIDDLE);
						onSelect(added.index);
						onSet(added.gradient);
					}}
				/>
			</div>
			{gradient.stops.map((_, index) => (
				<StopRow {...props} index={index} key={slotsOf(gradient.stops.length)[index]} />
			))}
		</div>
	);
}

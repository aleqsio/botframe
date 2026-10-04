import type { ReactElement } from "react";
import type { Gradient } from "../../../document/paint";
import { slotsOf } from "../variables/reach";
import { PERCENT_STEP } from "../../input/step";
import { NumberChip } from "../layout/NumberChip";
import type { Bound } from "../numberValue";
import { ColorDraft } from "./ColorText";
import { IconButton } from "./IconButton";
import type { StopPick } from "./GradientBar";
import { stopAdded, stopMoved, stopRecolored, stopRemoved } from "./stops";

const PERCENT = 100;
const MIN_STOPS = 2;
const MIDDLE = 0.5;
const PRECISION = 10;

interface ListProps extends StopPick {
	onWrite: (gradient: Gradient) => void;
	onCommit: () => void;
}

function setOf({ onCommit, onWrite }: ListProps): (gradient: Gradient) => void {
	return (gradient) => {
		onWrite(gradient);
		onCommit();
	};
}

function neighborBound(gradient: Gradient, index: number): Bound {
	const before = gradient.stops[index - 1]?.position ?? 0;
	const after = gradient.stops[index + 1]?.position ?? 1;
	return { kind: "clamp", min: before * PERCENT, max: after * PERCENT };
}

function StopRow(props: ListProps & { index: number }): ReactElement | null {
	const { gradient, index, onCommit, onSelect, onWrite, selected } = props;
	const onSet = setOf(props);
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
			<NumberChip
				bound={neighborBound(gradient, index)}
				label="At"
				name={`${name} position`}
				onCommit={onCommit}
				onValue={(percent) => {
					onWrite(stopMoved(gradient, index, percent / PERCENT).gradient);
				}}
				step={PERCENT_STEP}
				unit="%"
				value={Math.round(stop.position * PERCENT * PRECISION) / PRECISION}
			/>
			<span className="color-swatch">
				<span className="color-swatch-fill" style={{ background: stop.color }} />
			</span>
			<ColorDraft
				label={`${name} color`}
				onPick={(color) => {
					onSet(stopRecolored(gradient, index, color));
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
	const { gradient, onSelect } = props;
	const onSet = setOf(props);
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

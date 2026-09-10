import type { ReactElement } from "react";
import { parseLength } from "../state/appearance";

export interface LengthRange {
	readonly id: string;
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly step: number;
}

export function RangeField({
	onPick,
	range,
	value,
}: {
	onPick: (next: number) => void;
	range: LengthRange;
	value: number;
}): ReactElement {
	return (
		<div className="appearance-row">
			<label htmlFor={range.id}>{range.label}</label>
			<input
				id={range.id}
				max={range.max}
				min={range.min}
				onChange={(event) => {
					onPick(parseLength(event.currentTarget.value, value, range.max));
				}}
				step={range.step}
				type="range"
				value={value}
			/>
			<span className="appearance-value">{value}px</span>
		</div>
	);
}

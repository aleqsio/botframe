import type { ReactElement } from "react";
import { DraftInput } from "../PropertyField";
import { ChipGrip } from "./ChipGrip";
import { UnitMenu } from "./UnitMenu";
import { measureText, parseMeasure, unitStep } from "./measure";
import type { Measure } from "./measure";

const LENGTH_MAX = 100_000;
const AUTO = "auto";

export interface LengthFieldProps<U extends string> {
	label: string;
	text: string;
	value: Measure<U>;
	units: readonly U[];
	min: number;
	onChange: (next: Measure<U>) => void;
	onCommit: () => void;
	tips?: Partial<Record<U, string>> | undefined;
}

export function LengthField<U extends string>({
	label,
	min,
	onChange,
	onCommit,
	text,
	tips,
	units,
	value,
}: LengthFieldProps<U>): ReactElement {
	const locked = value.unit === AUTO;

	return (
		<div className="number-chip">
			<ChipGrip
				bound={{ kind: "clamp", min, max: LENGTH_MAX }}
				disabled={locked}
				label={text}
				name={label}
				onCommit={onCommit}
				onValue={(next) => {
					onChange({ value: next, unit: value.unit });
				}}
				step={unitStep(value.unit)}
				value={value.value}
			/>
			<DraftInput
				disabled={locked}
				inputMode="numeric"
				label={`${label} value`}
				onCommit={(typed) => {
					const next = parseMeasure(typed, units, value.unit);
					if (next !== null) {
						onChange(next);
						onCommit();
					}
				}}
				value={measureText(value)}
			/>
			<UnitMenu
				label={label}
				onPick={(unit) => {
					onChange({ value: value.value, unit });
					onCommit();
				}}
				tips={tips}
				units={units}
				value={value.unit}
			/>
		</div>
	);
}

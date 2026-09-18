import type { ReactElement } from "react";
import { DraftInput } from "../PropertyField";
import { UnitMenu } from "./UnitMenu";
import { measureText, parseMeasure } from "./measure";
import type { Measure } from "./measure";

export interface LengthFieldProps<U extends string> {
	label: string;
	text?: string | undefined;
	value: Measure<U>;
	units: readonly U[];
	onChange: (next: Measure<U>) => void;
	disabled?: boolean | undefined;
	tips?: Partial<Record<U, string>> | undefined;
}

export function LengthField<U extends string>({
	disabled = false,
	label,
	onChange,
	text,
	tips,
	units,
	value,
}: LengthFieldProps<U>): ReactElement {
	return (
		<div className={disabled ? "number-chip layout-chip-off" : "number-chip"}>
			{text === undefined ? null : <span className="chip-name">{text}</span>}
			<DraftInput
				disabled={disabled || value.unit === "auto"}
				inputMode="numeric"
				label={`${label} value`}
				onCommit={(typed) => {
					const next = parseMeasure(typed, units, value.unit);
					if (next !== null) {
						onChange(next);
					}
				}}
				value={measureText(value)}
			/>
			<UnitMenu
				disabled={disabled}
				label={label}
				onPick={(unit) => {
					onChange({ value: value.value, unit });
				}}
				tips={tips}
				units={units}
				value={value.unit}
			/>
		</div>
	);
}

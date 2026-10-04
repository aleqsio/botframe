import type { ReactElement } from "react";
import type { StepRule } from "../../input/step";
import { DraftInput } from "../PropertyField";
import { boundValue, formatNumber, numberIn } from "../numberValue";
import type { Bound } from "../numberValue";
import { ChipGrip } from "./ChipGrip";

export interface NumberChipProps {
	label: string;
	name: string;
	unit: string;
	value: number;
	bound: Bound;
	step: StepRule;
	disabled?: boolean | undefined;
	onValue: (value: number) => void;
	onCommit: () => void;
}

export function NumberChip(props: NumberChipProps): ReactElement {
	const { bound, disabled = false, name, onCommit, onValue, unit, value } = props;
	return (
		<div className={disabled ? "number-chip layout-chip-off" : "number-chip"}>
			<ChipGrip {...props} />
			<DraftInput
				disabled={disabled}
				inputMode="numeric"
				label={`${name} value`}
				onCommit={(text) => {
					const typed = numberIn(text);
					if (typed !== null) {
						onValue(boundValue(bound, typed));
						onCommit();
					}
				}}
				value={formatNumber(value)}
			/>
			<span aria-hidden="true" className="chip-unit">
				{unit}
			</span>
		</div>
	);
}

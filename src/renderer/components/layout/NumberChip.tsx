import type { ReactElement } from "react";
import type { StepRule } from "../../input/step";
import { DraftInput } from "../PropertyField";
import { boundValue, formatNumber } from "../numberValue";
import type { Bound } from "../numberValue";
import { ChipGrip } from "./ChipGrip";

export interface NumberChipProps {
	label: string;
	name: string;
	unit: string;
	value: number;
	bound: Bound;
	step: StepRule;
	onValue: (value: number) => void;
	onCommit: () => void;
}

export function NumberChip(props: NumberChipProps): ReactElement {
	const { bound, name, onCommit, onValue, unit, value } = props;
	return (
		<div className="number-chip">
			<ChipGrip {...props} />
			<DraftInput
				inputMode="numeric"
				label={`${name} value`}
				onCommit={(text) => {
					const typed = Number(text.trim());
					if (text.trim() !== "" && Number.isFinite(typed)) {
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

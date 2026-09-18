import type { ReactElement, ReactNode } from "react";
import { UNITS, isUnit } from "../../../document/length";
import { DraftInput } from "../PropertyField";
import { typedPatch } from "../layerFields";
import { formatNumber } from "../numberValue";
import { UnitMenu } from "./UnitMenu";
import type { ChipGripProps } from "./ChipGrip";

export interface ChipBoxProps extends ChipGripProps {
	disabled?: boolean | undefined;
	children?: ReactNode | undefined;
}

function commitText(props: ChipBoxProps, text: string): void {
	const patch = typedPatch(props.field, text);
	if (patch === null) {
		return;
	}
	props.onPatch(patch);
	props.onCommit();
}

function ChipUnit({ disabled, field, onCommit, onPatch }: ChipBoxProps): ReactElement | null {
	const { choice } = field;

	if (choice === null) {
		return field.unit === "" ? null : (
			<span aria-hidden="true" className="chip-unit">
				{field.unit}
			</span>
		);
	}

	return (
		<UnitMenu
			disabled={disabled}
			label={field.label}
			onPick={(unit) => {
				if (!isUnit(unit)) {
					return;
				}
				onPatch(choice.convert(unit));
				onCommit();
			}}
			possible={choice.possible}
			units={UNITS}
			value={field.unit}
		/>
	);
}

export function ChipBox(props: ChipBoxProps): ReactElement {
	const { children, disabled = false, field, value } = props;

	return (
		<div className={disabled ? "number-chip layout-chip-off" : "number-chip"}>
			{children}
			<DraftInput
				disabled={disabled}
				inputMode="numeric"
				label={`${field.label} value`}
				onCommit={(text) => {
					commitText(props, text);
				}}
				value={formatNumber(value)}
			/>
			<ChipUnit {...props} />
		</div>
	);
}

import type { ReactElement } from "react";
import { SIDES } from "../../../document/layout";
import type { Side } from "../../../document/layout";
import { LengthField } from "./LengthField";
import type { Measure } from "./measure";

const WORD: Readonly<Record<Side, string>> = {
	top: "Top",
	right: "Right",
	bottom: "Bottom",
	left: "Left",
};

export interface SideFieldsProps<U extends string> {
	group: string;
	values: Record<Side, Measure<U>>;
	units: readonly U[];
	min: number;
	onChange: (side: Side, next: Measure<U>) => void;
	onCommit: () => void;
	tips?: Partial<Record<U, string>> | undefined;
}

export function SideFields<U extends string>({
	group,
	min,
	onChange,
	onCommit,
	tips,
	units,
	values,
}: SideFieldsProps<U>): ReactElement {
	return (
		<>
			{SIDES.map((side) => (
				<div className={`layout-side layout-side-${side}`} key={side}>
					<LengthField
						label={`${group} ${side}`}
						min={min}
						onChange={(next) => {
							onChange(side, next);
						}}
						onCommit={onCommit}
						text={WORD[side]}
						tips={tips}
						units={units}
						value={values[side]}
					/>
				</div>
			))}
		</>
	);
}

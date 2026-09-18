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
	onChange: (side: Side, next: Measure<U>) => void;
	tips?: Partial<Record<U, string>> | undefined;
	worded?: boolean | undefined;
}

export function SideFields<U extends string>({
	group,
	onChange,
	tips,
	units,
	values,
	worded = false,
}: SideFieldsProps<U>): ReactElement {
	return (
		<>
			{SIDES.map((side) => (
				<div className={`layout-side layout-side-${side}`} key={side}>
					<LengthField
						label={`${group} ${side}`}
						onChange={(next) => {
							onChange(side, next);
						}}
						text={worded ? WORD[side] : undefined}
						tips={tips}
						units={units}
						value={values[side]}
					/>
				</div>
			))}
		</>
	);
}

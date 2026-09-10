import type { ReactElement } from "react";
import type { Appearance, InnerShadow } from "../state/appearance";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { InkField } from "./InkField";
import { RangeField } from "./RangeField";
import type { LengthRange } from "./RangeField";

const OFFSET: LengthRange = {
	id: "appearance-shadow-y",
	label: "Shadow Y",
	min: -12,
	max: 12,
	step: 0.5,
};
const BLUR: LengthRange = { id: "appearance-shadow-blur", label: "Blur", min: 0, max: 48, step: 1 };
const SPREAD: LengthRange = {
	id: "appearance-shadow-spread",
	label: "Spread",
	min: -12,
	max: 24,
	step: 1,
};

export function ShadowFields({ appearance }: { appearance: Slot<Appearance> }): ReactElement {
	const value = useSlot(appearance);
	const setShadow = (shadow: InnerShadow): void => {
		appearance.set({ ...value, shadow });
	};
	return (
		<>
			<RangeField
				onPick={(y) => {
					setShadow({ ...value.shadow, y });
				}}
				range={OFFSET}
				value={value.shadow.y}
			/>
			<RangeField
				onPick={(blur) => {
					setShadow({ ...value.shadow, blur });
				}}
				range={BLUR}
				value={value.shadow.blur}
			/>
			<RangeField
				onPick={(spread) => {
					setShadow({ ...value.shadow, spread });
				}}
				range={SPREAD}
				value={value.shadow.spread}
			/>
			<InkField
				id="appearance-shadow-ink"
				label="Shadow ink"
				onPick={(ink) => {
					setShadow({ ...value.shadow, ink });
				}}
				value={value.shadow.ink}
			/>
		</>
	);
}

import type { ReactElement } from "react";
import { parseHexColor } from "../state/appearance";
import type { Appearance, Hairline } from "../state/appearance";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { InkField } from "./InkField";
import { RangeField } from "./RangeField";
import type { LengthRange } from "./RangeField";
import { WidthField } from "./WidthField";

const RADIUS: LengthRange = { id: "appearance-radius", label: "Radius", min: 0, max: 32, step: 1 };
const INSET: LengthRange = { id: "appearance-inset", label: "Inset", min: 0, max: 32, step: 1 };

function CanvasRow({
	onPick,
	value,
}: {
	onPick: (next: string) => void;
	value: string;
}): ReactElement {
	return (
		<div className="appearance-row">
			<label htmlFor="appearance-canvas">Canvas</label>
			<input
				id="appearance-canvas"
				onChange={(event) => {
					onPick(parseHexColor(event.currentTarget.value, value));
				}}
				type="color"
				value={value}
			/>
			<span className="appearance-value">{value}</span>
		</div>
	);
}

export function CanvasFields({ appearance }: { appearance: Slot<Appearance> }): ReactElement {
	const value = useSlot(appearance);
	const setBorder = (border: Hairline): void => {
		appearance.set({ ...value, border });
	};
	return (
		<>
			<CanvasRow
				onPick={(canvas) => {
					appearance.set({ ...value, canvas });
				}}
				value={value.canvas}
			/>
			<RangeField
				onPick={(radius) => {
					appearance.set({ ...value, radius });
				}}
				range={RADIUS}
				value={value.radius}
			/>
			<RangeField
				onPick={(inset) => {
					appearance.set({ ...value, inset });
				}}
				range={INSET}
				value={value.inset}
			/>
			<WidthField
				onPick={(width) => {
					setBorder({ ...value.border, width });
				}}
				value={value.border.width}
			/>
			<InkField
				id="appearance-border-ink"
				label="Border ink"
				onPick={(ink) => {
					setBorder({ ...value.border, ink });
				}}
				value={value.border.ink}
			/>
		</>
	);
}

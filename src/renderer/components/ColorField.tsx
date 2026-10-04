import { Popover } from "@base-ui-components/react/popover";
import type { ReactElement } from "react";
import { ColorPicker } from "./ColorPicker";
import { DraftInput } from "./PropertyField";
import { BLACK, formatColor, parseColor } from "./color";
import { colorOf } from "./cssColor";
import { PresetGrid } from "./fill/SwatchGrid";

const POPUP_GAP = 10;

export interface ColorInputProps {
	label: string;
	value: string;
	onChange: (text: string) => void;
	onCommit: () => void;
}

function ColorPopup({ onChange, onCommit, value }: ColorInputProps): ReactElement {
	const color = parseColor(value) ?? BLACK;
	return (
		<Popover.Portal>
			<Popover.Positioner align="end" side="left" sideOffset={POPUP_GAP}>
				<Popover.Popup className="color-popup">
					<ColorPicker
						color={color}
						onChange={(next) => {
							onChange(formatColor(next));
						}}
						onCommit={onCommit}
					/>
					<PresetGrid
						color={color}
						onPick={(next) => {
							onChange(formatColor(next));
							onCommit();
						}}
					/>
				</Popover.Popup>
			</Popover.Positioner>
		</Popover.Portal>
	);
}

export function ColorInput(props: ColorInputProps): ReactElement {
	const { label, onChange, onCommit, value } = props;
	return (
		<>
			<Popover.Root>
				<Popover.Trigger aria-label={`${label} picker`} className="color-swatch">
					<span className="color-swatch-fill" style={{ background: value }} />
				</Popover.Trigger>
				<ColorPopup {...props} />
			</Popover.Root>
			<DraftInput
				inputMode="text"
				label={label}
				onCommit={(text) => {
					const color = colorOf(text);
					if (color === null) {
						return;
					}
					onChange(formatColor(color));
					onCommit();
				}}
				value={value}
			/>
		</>
	);
}

export function ColorField(input: ColorInputProps): ReactElement {
	return (
		<div className="property-field color-field">
			<span className="property-label">{input.label}</span>
			<ColorInput {...input} />
		</div>
	);
}

import { Popover } from "@base-ui-components/react/popover";
import type { ReactElement, ReactNode } from "react";
import { ColorPicker } from "./ColorPicker";
import { DraftInput } from "./PropertyField";
import { BLACK, formatColor, parseColor } from "./color";
import type { Rgba } from "./color";

const POPUP_GAP = 10;
const PROBE = "#010203";

export interface ColorFieldProps {
	label: string;
	value: string;
	onChange: (text: string) => void;
	onCommit: () => void;
	after?: ReactNode | undefined;
	replace?: ReactNode | undefined;
}

function cssColor(text: string): string {
	const context = document.createElement("canvas").getContext("2d");
	if (context === null) {
		return "";
	}
	context.fillStyle = PROBE;
	context.fillStyle = text;
	const painted = typeof context.fillStyle === "string" ? context.fillStyle : "";
	return painted === PROBE ? "" : painted;
}

function colorOf(text: string): Rgba | null {
	if (!CSS.supports("color", text)) {
		return null;
	}
	return parseColor(text) ?? parseColor(cssColor(text));
}

function ColorPopup({ onChange, onCommit, value }: ColorFieldProps): ReactElement {
	return (
		<Popover.Portal>
			<Popover.Positioner align="end" side="left" sideOffset={POPUP_GAP}>
				<Popover.Popup className="color-popup">
					<ColorPicker
						color={parseColor(value) ?? BLACK}
						onChange={(color) => {
							onChange(formatColor(color));
						}}
						onCommit={onCommit}
					/>
				</Popover.Popup>
			</Popover.Positioner>
		</Popover.Portal>
	);
}

export function ColorField(props: ColorFieldProps): ReactElement {
	const { label, onChange, onCommit, value } = props;

	return (
		<div className="property-field color-field">
			<span className="property-label">{label}</span>
			{props.replace ?? (
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
			)}
			{props.after}
		</div>
	);
}

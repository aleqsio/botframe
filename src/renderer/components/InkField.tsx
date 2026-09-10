import type { ReactElement } from "react";
import { parseHexColor, parseOpacity } from "../state/appearance";
import type { Ink } from "../state/appearance";

export function InkField({
	id,
	label,
	onPick,
	value,
}: {
	id: string;
	label: string;
	onPick: (next: Ink) => void;
	value: Ink;
}): ReactElement {
	return (
		<>
			<div className="appearance-row">
				<label htmlFor={`${id}-color`}>{label}</label>
				<input
					id={`${id}-color`}
					onChange={(event) => {
						onPick({ ...value, color: parseHexColor(event.currentTarget.value, value.color) });
					}}
					type="color"
					value={value.color}
				/>
				<button
					className="appearance-chip"
					onClick={() => {
						onPick({ ...value, color: "#ffffff" });
					}}
					type="button"
				>
					Lighter
				</button>
				<button
					className="appearance-chip"
					onClick={() => {
						onPick({ ...value, color: "#000000" });
					}}
					type="button"
				>
					Darker
				</button>
			</div>
			<div className="appearance-row">
				<label htmlFor={`${id}-opacity`}>Opacity</label>
				<input
					id={`${id}-opacity`}
					max="1"
					min="0"
					onChange={(event) => {
						onPick({ ...value, opacity: parseOpacity(event.currentTarget.value, value.opacity) });
					}}
					step="0.01"
					type="range"
					value={value.opacity}
				/>
				<span className="appearance-value">{Math.round(value.opacity * 100)}%</span>
			</div>
		</>
	);
}

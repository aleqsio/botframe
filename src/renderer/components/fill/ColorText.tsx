import type { ReactElement } from "react";
import { DraftInput } from "../PropertyField";
import type { Paint } from "../../../document/paint";
import { formatColor, parseColor } from "../color";
import type { Rgba } from "../color";
import { colorOf } from "../cssColor";
import { setPaint } from "./paintEdit";
import type { PaintEdit } from "./paintEdit";
import { gradientSummary } from "./stops";

const PERCENT = 100;

function alphaText(color: Rgba): string {
	return `${Math.round(color.a * PERCENT)}%`;
}

export function ColorDraft({
	label,
	onPick,
	value,
}: {
	label: string;
	value: string;
	onPick: (color: string) => void;
}): ReactElement {
	return (
		<DraftInput
			inputMode="text"
			label={label}
			onCommit={(text) => {
				const next = colorOf(text);
				if (next !== null) {
					onPick(formatColor(next));
				}
			}}
			value={value}
		/>
	);
}

export function HexField({
	color,
	label,
	onPick,
}: {
	color: Rgba;
	label: string;
	onPick: (color: Rgba) => void;
}): ReactElement {
	return (
		<div className="property-field hex-field">
			<ColorDraft
				label={label}
				onPick={(text) => {
					onPick(parseColor(text) ?? color);
				}}
				value={formatColor(color)}
			/>
			<span className="fill-alpha">{alphaText(color)}</span>
		</div>
	);
}

export function PaintText({
	edit,
	onOpen,
	paint,
}: {
	edit: PaintEdit;
	paint: Paint;
	onOpen: () => void;
}): ReactElement {
	if (paint.kind === "gradient") {
		return (
			<button className="fill-name" onClick={onOpen} type="button">
				{gradientSummary(paint.gradient)}
			</button>
		);
	}
	const color = parseColor(paint.color);
	return (
		<>
			<ColorDraft
				label="Fill"
				onPick={(text) => {
					setPaint(edit, text);
				}}
				value={paint.color}
			/>
			{color === null ? null : <span className="fill-alpha">{alphaText(color)}</span>}
		</>
	);
}

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
const CUSTOM_TEXT = "Custom CSS";

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

export function ColorEntry({
	label,
	onPick,
	value,
}: {
	label: string;
	value: string;
	onPick: (color: string) => void;
}): ReactElement {
	const color = parseColor(value);
	return (
		<>
			<ColorDraft label={label} onPick={onPick} value={value} />
			{color === null ? null : <span className="fill-alpha">{alphaText(color)}</span>}
		</>
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
	if (paint.kind === "solid") {
		return (
			<ColorEntry
				label="Fill"
				onPick={(text) => {
					setPaint(edit, text);
				}}
				value={paint.color}
			/>
		);
	}
	return (
		<button
			className="fill-name"
			data-opens=""
			onClick={onOpen}
			title={paint.kind === "custom" ? paint.text : undefined}
			type="button"
		>
			{paint.kind === "gradient" ? gradientSummary(paint.gradient) : CUSTOM_TEXT}
		</button>
	);
}

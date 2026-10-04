import { useState } from "react";
import type { ReactElement } from "react";
import { ColorPicker } from "../ColorPicker";
import { BLACK, formatColor, parseColor } from "../color";
import type { Rgba } from "../color";
import { Segmented } from "../layout/Segmented";
import type { SegmentOption } from "../layout/Segmented";
import type { EditTarget } from "../variables/target";
import { DocumentPaints, documentSwatches } from "./DocumentPaints";
import { ColorEntry } from "./ColorText";
import type { PaintEdit } from "./paintEdit";
import { PresetGrid } from "./SwatchGrid";

type ColorMode = "custom" | "swatches";

const MODES: readonly SegmentOption<ColorMode>[] = [
	{ value: "custom", label: "Custom" },
	{ value: "swatches", label: "Swatches" },
];

export function SolidTab({
	color: text,
	edit,
	target,
}: {
	color: string;
	edit: PaintEdit;
	target: EditTarget | null;
}): ReactElement {
	const color = parseColor(text) ?? BLACK;
	const swatches = target === null ? [] : documentSwatches(target.reach, "solid");
	const [mode, setMode] = useState<ColorMode>("custom");

	function pick(next: Rgba): void {
		edit.change(formatColor(next));
		edit.commit();
	}

	return (
		<>
			<Segmented label="Color mode" onPick={setMode} options={MODES} value={mode} />
			{mode === "custom" ? (
				<ColorPicker
					color={color}
					onChange={(next) => {
						edit.change(formatColor(next));
					}}
					onCommit={edit.commit}
				/>
			) : (
				<PresetGrid color={color} onPick={pick} />
			)}
			<div className="property-field hex-field">
				<ColorEntry
					label="Hex"
					onPick={(next) => {
						edit.change(next);
						edit.commit();
					}}
					value={formatColor(color)}
				/>
			</div>
			{target === null || swatches.length === 0 ? null : (
				<DocumentPaints label="Document colors" swatches={swatches} target={target} />
			)}
		</>
	);
}

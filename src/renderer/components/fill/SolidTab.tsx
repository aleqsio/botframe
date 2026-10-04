import type { ReactElement } from "react";
import { ColorPicker } from "../ColorPicker";
import { BLACK, formatColor, parseColor } from "../color";
import type { Rgba } from "../color";
import type { EditTarget } from "../variables/target";
import { DocumentPaints, documentSwatches } from "./DocumentPaints";
import { ColorEntry } from "./ColorText";
import type { PaintEdit } from "./paintEdit";
import { PresetGrid } from "./SwatchGrid";

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

	function pick(next: Rgba): void {
		edit.change(formatColor(next));
		edit.commit();
	}

	return (
		<>
			<ColorPicker
				color={color}
				onChange={(next) => {
					edit.change(formatColor(next));
				}}
				onCommit={edit.commit}
			/>
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
			{target === null || swatches.length === 0 ? (
				<PresetGrid color={color} onPick={pick} />
			) : (
				<DocumentPaints label="Document colors" swatches={swatches} target={target} />
			)}
		</>
	);
}

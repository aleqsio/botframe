import type { ReactElement } from "react";
import { parseColor } from "../color";
import type { Rgba } from "../color";

export interface Swatch {
	key: string;
	label: string;
	paint: string;
}

const PRESETS: readonly Swatch[] = [
	"#000000",
	"#ffffff",
	"#d9d9d9",
	"#ff3b30",
	"#ff9500",
	"#ffcc00",
	"#34c759",
	"#0d99ff",
	"#af52de",
].map((text) => ({ key: text, label: text, paint: text }));

export function SwatchGrid({
	label,
	onPick,
	picked,
	swatches,
}: {
	label: string;
	swatches: readonly Swatch[];
	picked: string | null;
	onPick: (swatch: Swatch) => void;
}): ReactElement {
	return (
		<fieldset aria-label={label} className="swatch-grid">
			{swatches.map((swatch) => (
				<button
					aria-label={swatch.label}
					aria-pressed={swatch.key === picked}
					className="swatch-cell"
					key={swatch.key}
					onClick={() => {
						onPick(swatch);
					}}
					style={{ background: swatch.paint }}
					title={swatch.label}
					type="button"
				/>
			))}
		</fieldset>
	);
}

export function PresetGrid({
	color,
	onPick,
}: {
	color: Rgba;
	onPick: (color: Rgba) => void;
}): ReactElement {
	return (
		<SwatchGrid
			label="Preset colors"
			onPick={(swatch) => {
				const picked = parseColor(swatch.paint);
				if (picked !== null) {
					onPick({ ...picked, a: color.a });
				}
			}}
			picked={null}
			swatches={PRESETS}
		/>
	);
}

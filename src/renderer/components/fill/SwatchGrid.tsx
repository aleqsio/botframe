import type { ReactElement } from "react";
import { formatColor, parseColor } from "../color";
import type { Rgba } from "../color";

export interface Swatch {
	key: string;
	label: string;
	paint: string;
}

const PRESETS: readonly Swatch[] = [
	[
		"#000000",
		"#262626",
		"#404040",
		"#595959",
		"#808080",
		"#a6a6a6",
		"#d9d9d9",
		"#f2f2f2",
		"#ffffff",
	],
	[
		"#ff3b30",
		"#ff9500",
		"#ffcc00",
		"#34c759",
		"#00c7be",
		"#0d99ff",
		"#5856d6",
		"#af52de",
		"#ff2d55",
	],
	[
		"#ffb3ae",
		"#ffd599",
		"#ffeb99",
		"#aee9bd",
		"#99e9e5",
		"#9ed6ff",
		"#bcbbef",
		"#dfbaf2",
		"#ffabbb",
	],
	[
		"#a6261f",
		"#a66100",
		"#a68500",
		"#22813a",
		"#00817b",
		"#0963a6",
		"#39388b",
		"#723590",
		"#a61d37",
	],
]
	.flat()
	.map((text) => ({ key: text, label: text, paint: text }));

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
			picked={formatColor({ ...color, a: 1 })}
			swatches={PRESETS}
		/>
	);
}

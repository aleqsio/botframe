export interface Ink {
	readonly color: string;
	readonly opacity: number;
}

export interface Hairline {
	readonly width: number;
	readonly ink: Ink;
}

export interface InnerShadow {
	readonly y: number;
	readonly blur: number;
	readonly spread: number;
	readonly ink: Ink;
}

export interface Appearance {
	readonly canvas: string;
	readonly radius: number;
	readonly inset: number;
	readonly border: Hairline;
	readonly shadow: InnerShadow;
	readonly tint: Ink;
}

export const BORDER_WIDTHS = [0, 0.5, 1] as const;

export const DEFAULT_APPEARANCE: Appearance = {
	canvas: "#f2f2f2",
	radius: 10,
	inset: 6,
	border: { width: 0, ink: { color: "#ffffff", opacity: 0.5 } },
	shadow: { y: 0, blur: 0, spread: 0, ink: { color: "#000000", opacity: 0.12 } },
	tint: { color: "#1e1e28", opacity: 0 },
};

const HEX_COLOR = /^#[\da-f]{6}$/iu;
const CHANNEL_STARTS = [1, 3, 5];

export function parseHexColor(value: string, fallback: string): string {
	return HEX_COLOR.test(value) ? value : fallback;
}

export function parseOpacity(value: string, fallback: number): number {
	const parsed = Number(value);
	if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
		return fallback;
	}
	return parsed;
}

export function parseLength(value: string, fallback: number, max: number): number {
	const parsed = Number(value);
	if (value.trim() === "" || !Number.isFinite(parsed) || parsed < -max || parsed > max) {
		return fallback;
	}
	return parsed;
}

export function inkCss(ink: Ink): string {
	const channels = CHANNEL_STARTS.map((start) =>
		Number.parseInt(ink.color.slice(start, start + 2), 16),
	);
	return `rgb(${channels.join(" ")} / ${ink.opacity})`;
}

function shadowLayers({ border, shadow }: Appearance): readonly string[] {
	const layers: string[] = [];
	if (border.width !== 0) {
		layers.push(`inset 0 0 0 ${border.width}px ${inkCss(border.ink)}`);
	}
	if (shadow.y !== 0 || shadow.blur !== 0 || shadow.spread !== 0) {
		layers.push(`inset 0 ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${inkCss(shadow.ink)}`);
	}
	return layers;
}

export function appearanceCss(appearance: Appearance): string {
	const layers = shadowLayers(appearance);
	const declarations = [
		`--stage-background: ${appearance.canvas}`,
		`--canvas-radius: ${appearance.radius}px`,
		`--canvas-inset: ${appearance.inset}px`,
		`--app-tint: ${inkCss(appearance.tint)}`,
		`--stage-shadow: ${layers.length === 0 ? "none" : layers.join(", ")}`,
	];
	return `:root { ${declarations.join("; ")}; }`;
}

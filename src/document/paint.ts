export const GRADIENT_SHAPES = ["linear", "radial", "conic"] as const;

export type GradientShape = (typeof GRADIENT_SHAPES)[number];

export const MIN_STOPS = 2;

export interface GradientStop {
	readonly color: string;
	readonly position: number;
}

export type Gradient =
	| { readonly shape: "radial"; readonly stops: readonly GradientStop[] }
	| {
			readonly shape: "linear" | "conic";
			readonly angle: number;
			readonly stops: readonly GradientStop[];
	  };

export type Paint =
	| { readonly kind: "solid"; readonly color: string }
	| { readonly kind: "gradient"; readonly gradient: Gradient }
	| { readonly kind: "custom"; readonly text: string };

export type EditableKind = "solid" | "gradient";

const GRADIENT_TEXT = /^(linear|radial|conic)-gradient\((.*)\)$/su;
const NUMBER = "(-?\\d+(?:\\.\\d+)?)";
const LINEAR_LEAD = new RegExp(`^${NUMBER}deg$`, "u");
const CONIC_LEAD = new RegExp(`^from ${NUMBER}deg$`, "u");
const STOP_TEXT = new RegExp(`^(#[0-9a-f]{3,8}) ${NUMBER}%$`, "iu");
const PERCENT = 100;
const PRECISION = 10;
const START_ANGLE = 180;

function stopOf(text: string): GradientStop | null {
	const [, color, percent] = STOP_TEXT.exec(text) ?? [];
	return color === undefined || percent === undefined
		? null
		: { color, position: Number(percent) / PERCENT };
}

function stopsOf(parts: readonly string[]): readonly GradientStop[] | null {
	const stops = parts.map((part) => stopOf(part));
	const held = stops.filter((stop) => stop !== null);
	const ordered = held.every(
		(stop, index) => stop.position <= 1 && stop.position >= (held[index - 1]?.position ?? 0),
	);
	return held.length === stops.length && held.length >= MIN_STOPS && ordered ? held : null;
}

const LEADS: Readonly<Record<"linear" | "conic", RegExp>> = {
	linear: LINEAR_LEAD,
	conic: CONIC_LEAD,
};

function angledOf(shape: "linear" | "conic", parts: readonly string[]): Gradient | null {
	const [lead = "", ...rest] = parts;
	const degrees = LEADS[shape].exec(lead)?.[1];
	const stops = stopsOf(rest);
	return degrees === undefined || stops === null ? null : { shape, angle: Number(degrees), stops };
}

function gradientOf(text: string): Gradient | null {
	const [, shape, body] = GRADIENT_TEXT.exec(text.trim()) ?? [];
	if (body === undefined) {
		return null;
	}
	const parts = body.split(", ");
	if (shape === "radial") {
		const stops = stopsOf(parts);
		return stops === null ? null : { shape, stops };
	}
	return shape === "linear" || shape === "conic" ? angledOf(shape, parts) : null;
}

export function paintOf(text: string): Paint {
	const gradient = gradientOf(text);
	if (gradient !== null) {
		return { kind: "gradient", gradient };
	}
	return text.includes("gradient(") ? { kind: "custom", text } : { kind: "solid", color: text };
}

export function withShape(gradient: Gradient, shape: GradientShape): Gradient {
	const { stops } = gradient;
	if (shape === "radial") {
		return { shape, stops };
	}
	return { shape, stops, angle: gradient.shape === "radial" ? START_ANGLE : gradient.angle };
}

function rounded(value: number): number {
	return Math.round(value * PRECISION) / PRECISION;
}

function leadText(gradient: Gradient): string {
	if (gradient.shape === "radial") {
		return "";
	}
	const angle = `${rounded(gradient.angle)}deg, `;
	return gradient.shape === "linear" ? angle : `from ${angle}`;
}

export function gradientText(gradient: Gradient): string {
	const stops = gradient.stops
		.map((stop) => `${stop.color} ${rounded(stop.position * PERCENT)}%`)
		.join(", ");
	return `${gradient.shape}-gradient(${leadText(gradient)}${stops})`;
}

export const GRADIENT_SHAPES = ["linear", "radial", "conic"] as const;

export type GradientShape = (typeof GRADIENT_SHAPES)[number];

export interface GradientStop {
	readonly color: string;
	readonly position: number;
}

export interface Gradient {
	readonly shape: GradientShape;
	readonly angle: number;
	readonly stops: readonly GradientStop[];
}

export type Paint =
	| { readonly kind: "solid"; readonly color: string }
	| { readonly kind: "gradient"; readonly gradient: Gradient };

interface Lead {
	angle: number;
	config: boolean;
}

const GRADIENT_TEXT = /^(linear|radial|conic)-gradient\((.*)\)$/isu;
const DEGREES = /^(-?\d+(?:\.\d+)?)deg$/u;
const CONIC_FROM = /^from\s+(-?\d+(?:\.\d+)?)deg(?:\s+at\s.*)?$/u;
const RADIAL_CONFIG = /^(?:circle|ellipse|closest|farthest|at\s)/u;
const STOP_TEXT = /^(.+?)(?:\s+(-?\d+(?:\.\d+)?)%)?$/su;
const PERCENT = 100;
const PRECISION = 10;
const MIN_STOPS = 2;

const DEFAULT_ANGLE: Readonly<Record<GradientShape, number>> = {
	linear: 180,
	radial: 180,
	conic: 0,
};

const SIDES: Readonly<Record<string, number>> = {
	"to top": 0,
	"to right": 90,
	"to bottom": 180,
	"to left": 270,
};

function isShape(text: string): text is GradientShape {
	return GRADIENT_SHAPES.some((shape) => shape === text);
}

function topLevelParts(body: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (const [index, character] of Array.from(body).entries()) {
		depth += character === "(" ? 1 : 0;
		depth -= character === ")" ? 1 : 0;
		if (character === "," && depth === 0) {
			parts.push(body.slice(start, index).trim());
			start = index + 1;
		}
	}
	parts.push(body.slice(start).trim());
	return parts;
}

function leadOf(shape: GradientShape, first: string): Lead {
	const text = first.toLowerCase();
	if (shape === "linear") {
		const side = SIDES[text];
		const degrees = DEGREES.exec(text)?.[1];
		const angle = side ?? (degrees === undefined ? undefined : Number(degrees));
		return angle === undefined
			? { angle: DEFAULT_ANGLE.linear, config: false }
			: { angle, config: true };
	}
	if (shape === "conic") {
		const from = CONIC_FROM.exec(text)?.[1];
		const config = from !== undefined || text.startsWith("at ");
		return { angle: from === undefined ? DEFAULT_ANGLE.conic : Number(from), config };
	}
	return { angle: DEFAULT_ANGLE.radial, config: RADIAL_CONFIG.test(text) };
}

function heldPosition(position: number): number {
	return Math.min(Math.max(position, 0), 1);
}

function stopsOf(parts: readonly string[]): GradientStop[] {
	const last = Math.max(parts.length - 1, 1);
	return parts
		.flatMap((part, index) => {
			const match = STOP_TEXT.exec(part);
			const color = match?.[1]?.trim();
			if (color === undefined || color === "") {
				return [];
			}
			const percent = match?.[2];
			const position = percent === undefined ? index / last : Number(percent) / PERCENT;
			return [{ color, position: heldPosition(position) }];
		})
		.toSorted((one, other) => one.position - other.position);
}

function gradientOf(text: string): Gradient | null {
	const match = GRADIENT_TEXT.exec(text.trim());
	const shape = match?.[1]?.toLowerCase();
	const body = match?.[2];
	if (shape === undefined || body === undefined || !isShape(shape)) {
		return null;
	}
	const [first = "", ...rest] = topLevelParts(body);
	const lead = leadOf(shape, first);
	const stops = stopsOf(lead.config ? rest : [first, ...rest]);
	return stops.length < MIN_STOPS ? null : { shape, angle: lead.angle, stops };
}

export function paintOf(text: string): Paint {
	const gradient = gradientOf(text);
	return gradient === null ? { kind: "solid", color: text } : { kind: "gradient", gradient };
}

function rounded(value: number): number {
	return Math.round(value * PRECISION) / PRECISION;
}

function leadText(gradient: Gradient): string {
	const angle = `${rounded(gradient.angle)}deg`;
	const leads: Readonly<Record<GradientShape, string>> = {
		linear: `${angle}, `,
		radial: "",
		conic: `from ${angle}, `,
	};
	return leads[gradient.shape];
}

export function gradientText(gradient: Gradient): string {
	const stops = gradient.stops
		.map((stop) => `${stop.color} ${rounded(stop.position * PERCENT)}%`)
		.join(", ");
	return `${gradient.shape}-gradient(${leadText(gradient)}${stops})`;
}

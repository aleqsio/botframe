import { gradientText } from "../../../document/paint";
import type { Gradient, GradientStop, Paint } from "../../../document/paint";
import { BLACK, formatColor, heldRatio, parseColor } from "../color";
import type { Rgba } from "../color";

const MIN_STOPS = 2;

export interface EditedStop {
	gradient: Gradient;
	index: number;
}

export function seededGradient(color: string): Gradient {
	const start = parseColor(color) ?? BLACK;
	return {
		shape: "linear",
		angle: 180,
		stops: [
			{ color: formatColor(start), position: 0 },
			{ color: formatColor({ ...start, a: 0 }), position: 1 },
		],
	};
}

function mixed(one: Rgba, other: Rgba, ratio: number): Rgba {
	const mix = (from: number, to: number): number => from + (to - from) * ratio;
	return {
		r: mix(one.r, other.r),
		g: mix(one.g, other.g),
		b: mix(one.b, other.b),
		a: mix(one.a, other.a),
	};
}

function colorAt(stops: readonly GradientStop[], position: number): string {
	const after = stops.findIndex((stop) => stop.position >= position);
	const right = stops[after === -1 ? stops.length - 1 : after];
	const left = stops[Math.max(after - 1, 0)] ?? right;
	if (left === undefined || right === undefined) {
		return formatColor(BLACK);
	}
	const span = right.position - left.position;
	const ratio = span === 0 ? 0 : (position - left.position) / span;
	const from = parseColor(left.color) ?? BLACK;
	return formatColor(mixed(from, parseColor(right.color) ?? from, ratio));
}

function placed(
	gradient: Gradient,
	stops: readonly GradientStop[],
	stop: GradientStop,
): EditedStop {
	const sorted = [...stops, stop].toSorted((one, other) => one.position - other.position);
	return { gradient: { ...gradient, stops: sorted }, index: sorted.indexOf(stop) };
}

export function stopAdded(gradient: Gradient, position: number): EditedStop {
	const held = heldRatio(position);
	return placed(gradient, gradient.stops, { color: colorAt(gradient.stops, held), position: held });
}

export function stopMoved(gradient: Gradient, index: number, position: number): EditedStop {
	const moving = gradient.stops[index];
	if (moving === undefined) {
		return { gradient, index };
	}
	const rest = gradient.stops.filter((stop) => stop !== moving);
	return placed(gradient, rest, { ...moving, position: heldRatio(position) });
}

export function stopRemoved(gradient: Gradient, index: number): Gradient {
	if (gradient.stops.length <= MIN_STOPS) {
		return gradient;
	}
	return { ...gradient, stops: gradient.stops.filter((_, at) => at !== index) };
}

export function stopRecolored(gradient: Gradient, index: number, color: string): Gradient {
	return {
		...gradient,
		stops: gradient.stops.map((stop, at) => (at === index ? { ...stop, color } : stop)),
	};
}

export function paintTextAs(paint: Paint, kind: Paint["kind"]): string {
	if (paint.kind === "solid") {
		return kind === "solid" ? paint.color : gradientText(seededGradient(paint.color));
	}
	if (kind === "gradient") {
		return gradientText(paint.gradient);
	}
	return paint.gradient.stops[0]?.color ?? formatColor(BLACK);
}

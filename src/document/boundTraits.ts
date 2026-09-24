import type { BindingKey } from "./bindings";
import type { LayerTraits } from "./layer";
import { PIXELS } from "./length";
import type { BoxKey } from "./length";
import type { Literal } from "./variable";

function boxTraits(traits: LayerTraits, key: BoxKey, value: number): LayerTraits {
	return {
		...traits,
		[key]: value,
		lengths: { ...traits.lengths, [key]: { value, unit: PIXELS } },
	};
}

function cornerTraits(
	traits: LayerTraits,
	key: "cornerRadius" | "cornerSmoothing",
	value: number,
): LayerTraits {
	const { geometry } = traits;
	return geometry.kind === "rectangle"
		? { ...traits, geometry: { ...geometry, [key]: value } }
		: traits;
}

type Apply = (traits: LayerTraits, value: Literal) => LayerTraits;

function numeric(apply: (traits: LayerTraits, value: number) => LayerTraits): Apply {
	return (traits, value) => (typeof value === "number" ? apply(traits, value) : traits);
}

const APPLY: Readonly<Record<BindingKey, Apply>> = {
	fill: (traits, value) => (typeof value === "string" ? { ...traits, fill: value } : traits),
	clip: (traits, value) => (typeof value === "boolean" ? { ...traits, clip: value } : traits),
	x: numeric((traits, value) => boxTraits(traits, "x", value)),
	y: numeric((traits, value) => boxTraits(traits, "y", value)),
	width: numeric((traits, value) => boxTraits(traits, "width", value)),
	height: numeric((traits, value) => boxTraits(traits, "height", value)),
	rotation: numeric((traits, value) => ({ ...traits, rotation: value })),
	cornerRadius: numeric((traits, value) => cornerTraits(traits, "cornerRadius", value)),
	cornerSmoothing: numeric((traits, value) => cornerTraits(traits, "cornerSmoothing", value)),
};

export function boundTraits(traits: LayerTraits, key: BindingKey, value: Literal): LayerTraits {
	return APPLY[key](traits, value);
}

import { GUIDE_AXES } from "../../../document/guides";
import type { Guide, GuideAxis } from "../../../document/guides";
import type { Layer, LayerPatch } from "../../../document/layer";
import { PIXELS } from "../../../document/length";
import { LENGTH_STEP } from "../../input/step";
import type { LayerField } from "../layerFields";

const GUIDE_LIMIT = 100_000;
const HALF = 2;

export const GUIDE_MESSAGE = "set guides";

export const GUIDE_LABELS: Readonly<Record<GuideAxis, string>> = {
	x: "Vertical",
	y: "Horizontal",
};

export { GUIDE_AXES };

export function guideField(layer: Layer, index: number, guide: Guide): LayerField {
	return {
		label: GUIDE_LABELS[guide.axis],
		unit: PIXELS,
		choice: null,
		bound: { kind: "clamp", min: -GUIDE_LIMIT, max: GUIDE_LIMIT },
		step: LENGTH_STEP,
		message: GUIDE_MESSAGE,
		read: (held) => held.guides[index]?.at ?? 0,
		patch: (value) => ({
			guides: layer.guides.map((held, at) => (at === index ? { ...held, at: value } : held)),
		}),
	};
}

export function addedGuide(layer: Layer, axis: GuideAxis): LayerPatch {
	const at = axis === "x" ? layer.width / HALF : layer.height / HALF;
	return { guides: [...layer.guides, { axis, at: Math.round(at) }] };
}

export function removedGuide(layer: Layer, index: number): LayerPatch {
	return { guides: layer.guides.filter((_, at) => at !== index) };
}

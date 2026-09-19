import { bagOf, listOf } from "./bag";

export type GuideAxis = "x" | "y";

export const GUIDE_AXES: readonly GuideAxis[] = ["x", "y"];

export interface Guide {
	axis: GuideAxis;
	at: number;
}

export const NO_GUIDES: readonly Guide[] = [];

function guideOf(value: unknown): Guide | null {
	const bag = bagOf(value);
	const axis = GUIDE_AXES.find((known) => known === bag["axis"]);
	const at = bag["at"];
	if (axis === undefined || typeof at !== "number" || !Number.isFinite(at)) {
		return null;
	}
	return { axis, at };
}

export function guidesOf(value: unknown): readonly Guide[] {
	const guides = listOf(value).flatMap((item) => guideOf(item) ?? []);
	return guides.length === 0 ? NO_GUIDES : guides;
}

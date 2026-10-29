import type { DesignDocument } from "../../document/document";
import type { Layer, LayerId, LayerPatch } from "../../document/layer";
import { CLIP_CHOICES, clipChoiceOf, clipReaches, clipsContent } from "../../document/clips";
import type { Literal } from "../../document/value";
import { copiesOf } from "../../document/path";
import { outOfFlow } from "../layerStyle";
import type { SegmentOption } from "./layout/Segmented";

export const CLIP_MESSAGE = "set clip";
const NO_SOURCE = "No other layer to clip to";
const IN_COPY = "A copy follows its component. Set the clip in the component";
const IN_FLOW = "A layout places this layer. Set its position to absolute to clip it to a layer";

export type ClipMode = "none" | "shape" | "layer";

type LayerSource = Pick<DesignDocument, "layer" | "layerIds" | "siblingIds">;
type ClipState = Pick<Layer, "clip" | "clipLayer" | "geometry" | "content">;

export function clipModeOf(layer: ClipState): ClipMode {
	return clipModeOfValue(clipChoiceOf(layer)) ?? "none";
}

function ancestorIds(doc: LayerSource, layer: Layer): Set<LayerId> {
	const ids = new Set<LayerId>();
	let parent = layer.parent;
	while (parent !== null && !ids.has(parent)) {
		ids.add(parent);
		parent = doc.layer(parent)?.parent ?? null;
	}
	return ids;
}

function placedByLayout(doc: LayerSource, layer: Layer): boolean {
	const parent = layer.parent === null ? null : doc.layer(layer.parent);
	return parent !== null && !outOfFlow(parent.layout.display, layer.layout.position);
}

export function clipCandidates(doc: LayerSource, layer: Layer): Layer[] {
	const ancestors = ancestorIds(doc, layer);
	const read = (id: LayerId): Layer | null => doc.layer(id);
	return doc
		.layerIds()
		.filter((id) => id !== layer.id && !ancestors.has(id))
		.flatMap((id) => doc.layer(id) ?? [])
		.filter(
			(candidate) => !placedByLayout(doc, candidate) && !clipReaches(read, candidate, layer.id),
		);
}

export function firstClipSource(
	doc: LayerSource,
	layer: Layer,
	candidates: readonly Layer[],
): LayerId | null {
	const siblings = doc.siblingIds(layer.parent);
	const above = siblings[siblings.indexOf(layer.id) + 1];
	const near = candidates.find((candidate) => candidate.id === above);
	return (near ?? candidates[0])?.id ?? null;
}

export function clipPatch(mode: ClipMode, source: LayerId | null): LayerPatch {
	return mode === "layer"
		? { clip: false, clipLayer: source }
		: { clip: mode === "shape", clipLayer: null };
}

export function clipLayerTitle(
	doc: LayerSource,
	layer: Layer,
	candidates: readonly Layer[],
): string | undefined {
	if (copiesOf(layer.id).length > 0) {
		return IN_COPY;
	}
	if (placedByLayout(doc, layer)) {
		return IN_FLOW;
	}
	return candidates.length === 0 ? NO_SOURCE : undefined;
}

export function clipOptions(
	layer: Pick<Layer, "geometry" | "content">,
	layerTitle: string | undefined,
): readonly SegmentOption<ClipMode>[] {
	const options: readonly SegmentOption<ClipMode>[] = [
		{ value: "none", label: CLIP_CHOICES.none },
		{ value: "shape", label: CLIP_CHOICES.shape },
		{
			value: "layer",
			label: CLIP_CHOICES.layer,
			disabled: layerTitle !== undefined,
			title: layerTitle,
		},
	];
	return clipsContent(layer) ? options : options.filter((option) => option.value !== "shape");
}

export function clipModeOfValue(value: Literal): ClipMode | null {
	if (typeof value === "boolean") {
		return value ? "shape" : "none";
	}
	const modes: readonly ClipMode[] = ["none", "shape", "layer"];
	return modes.find((mode) => CLIP_CHOICES[mode] === value) ?? null;
}

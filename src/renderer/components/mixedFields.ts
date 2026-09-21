import type { DesignDocument } from "../../document/document";
import type { Layer, LayerPatch } from "../../document/layer";
import { fieldGroupsOf, typedPatch } from "./layerFields";
import type { FieldGroup, LayerField } from "./layerFields";
import { sharedOf } from "./mixedValue";
import type { Mixed } from "./mixedValue";

function fieldFor(layer: Layer, label: string): LayerField | null {
	return (
		fieldGroupsOf(layer)
			.flatMap((group) => group.fields)
			.find((field) => field.label === label) ?? null
	);
}

export function sharedGroups(layers: readonly Layer[]): readonly FieldGroup[] {
	const [first, ...rest] = layers;
	if (first === undefined) {
		return [];
	}
	return fieldGroupsOf(first).filter((group) =>
		rest.every((layer) => fieldGroupsOf(layer).some((own) => own.name === group.name)),
	);
}

export function sharedField(layers: readonly Layer[], label: string): Mixed<number> | null {
	return sharedOf(
		layers.flatMap((layer) => {
			const field = fieldFor(layer, label);
			return field === null ? [] : [field.read(layer)];
		}),
	);
}

export function writeField(
	doc: DesignDocument,
	layers: readonly Layer[],
	label: string,
	text: string,
): void {
	let message: string | null = null;
	for (const layer of layers) {
		const field = fieldFor(layer, label);
		const patch = field === null ? null : typedPatch(field, text);
		if (field !== null && patch !== null) {
			doc.update(layer.id, patch);
			message = field.message;
		}
	}
	if (message !== null) {
		doc.commit(message);
	}
}

export function writeAll(
	doc: DesignDocument,
	layers: readonly Layer[],
	patch: LayerPatch,
	message: string,
): void {
	for (const layer of layers) {
		doc.update(layer.id, patch);
	}
	doc.commit(message);
}

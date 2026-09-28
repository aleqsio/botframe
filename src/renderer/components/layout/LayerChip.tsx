import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer, LayerPatch } from "../../../document/layer";
import type { LayerField } from "../layerFields";
import { BindableChip } from "../variables/BindableChip";
import { ChipBox } from "./ChipBox";
import type { ChipBoxProps } from "./ChipBox";
import { ChipGrip, fieldGrip } from "./ChipGrip";

export function FieldChip({
	box,
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
	box: ChipBoxProps;
}): ReactElement {
	const { bind, stored } = box.field;
	const key = bind?.key ?? stored;
	const marked = { ...box, changed: key !== undefined && isChanged(layer, key) };
	return bind === undefined ? (
		<ChipBox {...marked} />
	) : (
		<BindableChip bind={bind} box={marked} doc={doc} layer={layer} />
	);
}

export function LayerChip({
	doc,
	field,
	layer,
}: {
	doc: DesignDocument;
	field: LayerField;
	layer: Layer;
}): ReactElement {
	const value = field.read(layer);
	const onCommit = (): void => {
		doc.commit(field.message);
	};
	const onPatch = (patch: LayerPatch): void => {
		doc.update(layer.id, patch);
	};

	const box = {
		field,
		onCommit,
		onPatch,
		value,
		children: <ChipGrip {...fieldGrip(field, value, onPatch, onCommit)} />,
	};

	return <FieldChip box={box} doc={doc} layer={layer} />;
}

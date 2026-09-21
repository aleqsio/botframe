import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { DraftInput, PropertyField } from "./PropertyField";
import type { FieldGroup, LayerField } from "./layerFields";
import { sharedField, sharedGroups, writeAll, writeField } from "./mixedFields";
import { MIXED_TEXT, mixedText, sharedOf } from "./mixedValue";
import { formatNumber } from "./numberValue";
import { ChipSection } from "./layout/ChipSection";

const NAME_MESSAGE = "rename layers";
const FILL_MESSAGE = "set fill";
const CLIP_MESSAGE = "set clip";
const CLIP_LABEL = "Clip content";

interface PanelProps {
	doc: DesignDocument;
	layers: readonly Layer[];
}

function sameText(value: string): string {
	return value;
}

function MixedChip({ doc, field, layers }: PanelProps & { field: LayerField }): ReactElement {
	return (
		<div className="number-chip">
			<DraftInput
				inputMode="numeric"
				label={`${field.label} value`}
				onCommit={(text) => {
					writeField(doc, layers, field.label, text);
				}}
				value={mixedText(sharedField(layers, field.label), formatNumber)}
			/>
			{field.unit === "" ? null : (
				<span aria-hidden="true" className="chip-unit">
					{field.unit}
				</span>
			)}
		</div>
	);
}

function MixedGroup({ doc, group, layers }: PanelProps & { group: FieldGroup }): ReactElement {
	return (
		<ChipSection name={group.name}>
			{group.fields.map((field) => (
				<MixedChip doc={doc} field={field} key={field.label} layers={layers} />
			))}
		</ChipSection>
	);
}

function MixedClip({ doc, layers }: PanelProps): ReactElement {
	const shared = sharedOf(layers.map((layer) => layer.clip));
	const mixed = shared?.kind === "mixed";

	return (
		<label className="property-switch">
			<input
				checked={shared?.kind === "same" && shared.value}
				onChange={(event) => {
					writeAll(doc, layers, { clip: event.target.checked }, CLIP_MESSAGE);
				}}
				type="checkbox"
			/>
			{mixed ? `${CLIP_LABEL} (${MIXED_TEXT})` : CLIP_LABEL}
		</label>
	);
}

export function MixedProperties({ doc, layers }: PanelProps): ReactElement {
	return (
		<>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					writeAll(doc, layers, { name: text }, NAME_MESSAGE);
				}}
				value={mixedText(sharedOf(layers.map((layer) => layer.name)), sameText)}
			/>
			{sharedGroups(layers).map((group) => (
				<MixedGroup doc={doc} group={group} key={group.name} layers={layers} />
			))}
			<PropertyField
				label="Fill"
				onCommit={(text) => {
					writeAll(doc, layers, { fill: text }, FILL_MESSAGE);
				}}
				value={mixedText(sharedOf(layers.map((layer) => layer.fill)), sameText)}
			/>
			<MixedClip doc={doc} layers={layers} />
		</>
	);
}

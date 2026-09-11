import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { NumberChip } from "./NumberChip";
import { PropertyField } from "./PropertyField";
import { isArtboard } from "./layerEntry";
import { fieldPatch, fieldsOf, swappedBox } from "./layerFields";
import { CUSTOM_PRESET, PRESET_GROUPS, presetNameFor, presetNamed } from "./presets";

function applyPreset(doc: DesignDocument, layer: Layer, name: string): void {
	const preset = presetNamed(name);
	if (preset === null) {
		return;
	}
	doc.update(layer.id, { width: preset.width, height: preset.height });
	doc.commit(COMMIT_MESSAGES.resize);
}

function ArtboardFields({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<>
			<div className="property-select">
				<span className="property-label">Preset</span>
				<select
					aria-label="Preset"
					onChange={(event) => {
						applyPreset(doc, layer, event.target.value);
					}}
					value={presetNameFor(layer.width, layer.height)}
				>
					<option value={CUSTOM_PRESET}>{CUSTOM_PRESET}</option>
					{PRESET_GROUPS.map((group) => (
						<optgroup key={group.name} label={group.name}>
							{group.presets.map((preset) => (
								<option key={preset.name} value={preset.name}>
									{preset.name}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</div>
			<button
				className="panel-action"
				onClick={() => {
					doc.update(layer.id, swappedBox(layer));
					doc.commit(COMMIT_MESSAGES.resize);
				}}
				type="button"
			>
				Swap the orientation
			</button>
		</>
	);
}

export function LayerProperties({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	return (
		<>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					doc.update(layer.id, { name: text });
					doc.commit("rename layer");
				}}
				value={layer.name}
			/>
			<div className="property-grid">
				{fieldsOf(layer).map((field) => (
					<NumberChip
						field={field}
						key={field.label}
						onCommit={() => {
							doc.commit(field.message);
						}}
						onUpdate={(value) => {
							doc.update(layer.id, fieldPatch(field, value));
						}}
						value={field.read(layer)}
					/>
				))}
			</div>
			<PropertyField
				label="Fill"
				onCommit={(text) => {
					if (!CSS.supports("color", text)) {
						return;
					}
					doc.update(layer.id, { fill: text });
					doc.commit("set fill");
				}}
				value={layer.fill}
			/>
			<label className="property-switch">
				<input
					checked={layer.clip}
					onChange={(event) => {
						doc.update(layer.id, { clip: event.target.checked });
						doc.commit("set clip");
					}}
					type="checkbox"
				/>
				Clip content
			</label>
			{isArtboard(layer) ? <ArtboardFields doc={doc} layer={layer} /> : null}
		</>
	);
}

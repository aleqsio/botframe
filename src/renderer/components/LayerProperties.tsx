import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer, RectangleGeometry } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { NumberField, PropertyField } from "./PropertyField";
import { isArtboard } from "./layerEntry";
import { CORNER_FIELDS, LAYER_FIELDS, isHexColor, swappedBox } from "./layerFields";
import { CUSTOM_PRESET, PRESET_GROUPS, presetNameFor, presetNamed } from "./presets";

const RENAME_COMMIT = "rename layer";
const FILL_COMMIT = "set fill";
const CLIP_COMMIT = "set clip";
const CORNER_COMMIT = "set corners";

function applyPreset(doc: DesignDocument, layer: Layer, name: string): void {
	const preset = presetNamed(name);
	if (preset === null) {
		return;
	}
	doc.resize(layer.id, { x: layer.x, y: layer.y, width: preset.width, height: preset.height });
	doc.commit(COMMIT_MESSAGES.resize);
}

function rectangleGeometry(layer: Layer): RectangleGeometry | null {
	return layer.geometry.kind === "rectangle" ? layer.geometry : null;
}

function CornerFields({
	doc,
	geometry,
	layer,
}: {
	doc: DesignDocument;
	geometry: RectangleGeometry;
	layer: Layer;
}): ReactElement {
	return (
		<div className="property-grid">
			{CORNER_FIELDS.map((field) => (
				<NumberField
					key={field.label}
					label={field.label}
					onCommit={(value) => {
						doc.setGeometry(layer.id, field.next(geometry, value));
						doc.commit(CORNER_COMMIT);
					}}
					value={field.read(geometry)}
				/>
			))}
		</div>
	);
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
					doc.resize(layer.id, swappedBox(layer));
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
	const geometry = rectangleGeometry(layer);

	return (
		<>
			<PropertyField
				label="Name"
				onCommit={(text) => {
					doc.rename(layer.id, text);
					doc.commit(RENAME_COMMIT);
				}}
				value={layer.name}
			/>
			<div className="property-grid">
				{LAYER_FIELDS.map((field) => (
					<NumberField
						key={field.label}
						label={field.label}
						onCommit={(value) => {
							field.apply(doc, layer, value);
						}}
						value={field.read(layer)}
					/>
				))}
			</div>
			<PropertyField
				label="Fill"
				onCommit={(text) => {
					if (!isHexColor(text)) {
						return;
					}
					doc.setFill(layer.id, text);
					doc.commit(FILL_COMMIT);
				}}
				value={layer.fill}
			/>
			{geometry === null ? null : <CornerFields doc={doc} geometry={geometry} layer={layer} />}
			<label className="property-switch">
				<input
					checked={layer.clip}
					onChange={(event) => {
						doc.setClip(layer.id, event.target.checked);
						doc.commit(CLIP_COMMIT);
					}}
					type="checkbox"
				/>
				Clip content
			</label>
			{isArtboard(layer) ? <ArtboardFields doc={doc} layer={layer} /> : null}
		</>
	);
}

import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { Icon } from "./Icon";
import { swappedBox } from "./layerFields";
import { CUSTOM_PRESET, PRESET_GROUPS, presetNameFor, presetNamed } from "./presets";

type Orientation = "Portrait" | "Landscape";

const ORIENTATIONS: readonly Orientation[] = ["Portrait", "Landscape"];

function orientationOf(layer: Layer): Orientation {
	return layer.width > layer.height ? "Landscape" : "Portrait";
}

function applyPreset(doc: DesignDocument, layer: Layer, name: string): void {
	const preset = presetNamed(name);
	if (preset === null) {
		return;
	}
	doc.update(layer.id, { width: preset.width, height: preset.height });
	doc.commit(COMMIT_MESSAGES.resize);
}

function turnTo(doc: DesignDocument, layer: Layer, wanted: Orientation): void {
	if (orientationOf(layer) === wanted) {
		return;
	}
	doc.update(layer.id, swappedBox(layer));
	doc.commit(COMMIT_MESSAGES.resize);
}

function OrientationControl({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const held = orientationOf(layer);

	return (
		<fieldset aria-label="Orientation" className="segmented" data-active={held}>
			<span aria-hidden="true" className="segment-pill" />
			{ORIENTATIONS.map((name) => (
				<button
					aria-pressed={held === name}
					className="segment"
					key={name}
					onClick={() => {
						turnTo(doc, layer, name);
					}}
					type="button"
				>
					{name}
				</button>
			))}
		</fieldset>
	);
}

function PresetSelect({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<div className="footer-select">
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
			<span className="footer-chevron">
				<Icon name="chevron" />
			</span>
		</div>
	);
}

export function ArtboardFooter({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	return (
		<>
			<OrientationControl doc={doc} layer={layer} />
			<div className="card-footer">
				<span className="property-label">Preset</span>
				<PresetSelect doc={doc} layer={layer} />
			</div>
		</>
	);
}

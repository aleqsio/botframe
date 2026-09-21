import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { COMMIT_MESSAGES } from "../input/layerCommand";
import { Icon } from "./Icon";
import { CUSTOM_PRESET, PRESET_GROUPS, presetNameFor, presetNamed } from "./presets";

function applyPreset(doc: DesignDocument, layer: Layer, name: string): void {
	const preset = presetNamed(name);
	if (preset === null) {
		return;
	}
	doc.update(layer.id, { width: preset.width, height: preset.height });
	doc.commit(COMMIT_MESSAGES.resize);
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
		<div className="card-footer">
			<span className="property-label">Preset</span>
			<PresetSelect doc={doc} layer={layer} />
		</div>
	);
}

import { Toolbar } from "@base-ui-components/react/toolbar";
import type { ReactElement } from "react";
import { sidewaysPixels } from "../input/wheel";
import { swappedBox } from "./layerFields";
import { PRESET_GROUPS, thumbnailOf } from "./presets";
import type { ArtboardPreset } from "./presets";

const THUMBNAIL_BOX = 22;

function PresetButton({
	onPlace,
	preset,
}: {
	onPlace: (preset: ArtboardPreset) => void;
	preset: ArtboardPreset;
}): ReactElement {
	const thumbnail = thumbnailOf(preset, THUMBNAIL_BOX);

	return (
		<Toolbar.Button
			className="preset-button"
			onClick={() => {
				onPlace(preset);
			}}
		>
			<span aria-hidden="true" className="preset-thumbnail">
				<span style={{ width: `${thumbnail.width}px`, height: `${thumbnail.height}px` }} />
			</span>
			<span className="preset-text">
				<span className="preset-name">{preset.name}</span>
				<span className="preset-size">{`${preset.width} × ${preset.height}`}</span>
			</span>
		</Toolbar.Button>
	);
}

export function PresetRow({
	onPlace,
	swapped,
}: {
	onPlace: (preset: ArtboardPreset) => void;
	swapped: boolean;
}): ReactElement {
	return (
		<div
			className="preset-row"
			onWheel={(event) => {
				event.currentTarget.scrollLeft += sidewaysPixels(event);
			}}
		>
			{PRESET_GROUPS.map((group) => (
				<Toolbar.Group aria-label={group.name} className="preset-group" key={group.name}>
					<span aria-hidden="true" className="preset-group-label">
						{group.name}
					</span>
					{group.presets.map((preset) => (
						<PresetButton
							key={preset.name}
							onPlace={onPlace}
							preset={swapped ? { ...preset, ...swappedBox(preset) } : preset}
						/>
					))}
				</Toolbar.Group>
			))}
		</div>
	);
}

import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { viewportCenter } from "../state/camera";
import type { UserState } from "../state/userState";
import { ARTBOARD_DEFAULTS, drawnFields, finishDraw, placeLayer } from "./layerDefaults";
import { PRESET_GROUPS } from "./presets";
import type { ArtboardPreset } from "./presets";

export function PresetList({
	doc,
	stage,
	user,
}: {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}): ReactElement {
	function place(preset: ArtboardPreset): void {
		const box = stage.current?.getBoundingClientRect();
		if (box === undefined) {
			return;
		}
		const center = viewportCenter(user.camera.get(), box);
		const rect = {
			x: center.x - preset.width / 2,
			y: center.y - preset.height / 2,
			width: preset.width,
			height: preset.height,
		};
		placeLayer(doc, user, drawnFields(ARTBOARD_DEFAULTS, rect, preset.name), null);
		finishDraw(doc, user, ARTBOARD_DEFAULTS);
	}

	return (
		<div className="preset-groups">
			{PRESET_GROUPS.map((group) => (
				<details className="preset-group" key={group.name} open>
					<summary className="preset-summary">{group.name}</summary>
					{group.presets.map((preset) => (
						<button
							className="preset-row"
							key={preset.name}
							onClick={() => {
								place(preset);
							}}
							type="button"
						>
							<span>{preset.name}</span>
							<span className="preset-size">{`${preset.width} × ${preset.height}`}</span>
						</button>
					))}
				</details>
			))}
		</div>
	);
}

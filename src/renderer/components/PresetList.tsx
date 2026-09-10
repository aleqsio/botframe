import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import type { Rect } from "../../document/layer";
import { ARTBOARD_DEFAULTS, drawCommit, drawnFields } from "../input/drawBehavior";
import { viewportCenter } from "../state/camera";
import type { Point } from "../state/camera";
import type { UserState } from "../state/userState";
import { PRESET_GROUPS } from "./presets";
import type { ArtboardPreset } from "./presets";
import { DEFAULT_TOOL } from "./tools";

function boxAround(center: Point, preset: ArtboardPreset): Rect {
	return {
		x: center.x - preset.width / 2,
		y: center.y - preset.height / 2,
		width: preset.width,
		height: preset.height,
	};
}

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
		const rect = boxAround(viewportCenter(user.camera.get(), box), preset);
		user.selection.set([doc.createLayer(drawnFields(ARTBOARD_DEFAULTS, rect, preset.name))]);
		doc.commit(drawCommit(ARTBOARD_DEFAULTS));
		user.tool.set(DEFAULT_TOOL);
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

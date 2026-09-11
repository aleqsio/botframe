import { Toolbar } from "@base-ui-components/react/toolbar";
import { useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { DesignDocument } from "../../document/document";
import { viewportCenter } from "../state/camera";
import type { UserState } from "../state/userState";
import { FloatingBar } from "./FloatingBar";
import { ToolButton } from "./ToolButton";
import { ARTBOARD_DEFAULTS, drawnFields, finishDraw, placeLayer } from "./layerDefaults";
import { PresetRow } from "./PresetRow";
import type { ArtboardPreset } from "./presets";

interface PresetPlacement {
	doc: DesignDocument;
	stage: RefObject<HTMLElement | null>;
	user: UserState;
}

function placePreset({ doc, stage, user }: PresetPlacement, preset: ArtboardPreset): void {
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

export function ArtboardOptions(placement: PresetPlacement): ReactElement {
	const [swapped, setSwapped] = useState(false);

	return (
		<FloatingBar label="Artboard options">
			<ToolButton
				icon="swap"
				label="Swap width and height"
				onPress={() => {
					setSwapped(!swapped);
				}}
				pressed={swapped}
			/>
			<Toolbar.Separator className="bar-separator" />
			<PresetRow
				onPlace={(preset) => {
					placePreset(placement, preset);
				}}
				swapped={swapped}
			/>
		</FloatingBar>
	);
}

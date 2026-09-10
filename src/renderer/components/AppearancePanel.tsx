import type { ReactElement } from "react";
import type { Appearance } from "../state/appearance";
import { APPEARANCE_PRESETS } from "../state/appearancePresets";
import type { Slot } from "../state/slot";
import { useSlot } from "../state/useSlot";
import { CanvasFields } from "./CanvasFields";
import { InkField } from "./InkField";
import { ShadowFields } from "./ShadowFields";

export function AppearancePanel({ appearance }: { appearance: Slot<Appearance> }): ReactElement {
	const value = useSlot(appearance);
	return (
		<div className="appearance-panel">
			<div className="appearance-presets">
				{APPEARANCE_PRESETS.map((preset) => (
					<button
						className="appearance-preset"
						key={preset.name}
						onClick={() => {
							appearance.set(preset.appearance);
						}}
						type="button"
					>
						{preset.name}
					</button>
				))}
			</div>
			<CanvasFields appearance={appearance} />
			<ShadowFields appearance={appearance} />
			<InkField
				id="appearance-tint"
				label="Tint"
				onPick={(tint) => {
					appearance.set({ ...value, tint });
				}}
				value={value.tint}
			/>
		</div>
	);
}

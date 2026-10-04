import { Select } from "@base-ui-components/react/select";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { CLIP_MESSAGE, clipPatch } from "./clipChoice";
import { Icon } from "./Icon";
import { layerEntry } from "./layerEntry";

const MENU_GAP = 6;
const NO_PICK = "Pick a layer";
interface PickerProps {
	doc: DesignDocument;
	layer: Layer;
	candidates: readonly Layer[];
}

export function ClipLayerPicker({ candidates, doc, layer }: PickerProps): ReactElement {
	const source = candidates.find((candidate) => candidate.id === layer.clipLayer) ?? null;

	return (
		<div className="property-field">
			<span className="property-label">Layer</span>
			<Select.Root
				onValueChange={(next) => {
					const picked = candidates.find((candidate) => candidate.id === next);
					if (picked !== undefined) {
						doc.update(layer.id, clipPatch("layer", picked.id));
						doc.commit(CLIP_MESSAGE);
					}
				}}
				value={layer.clipLayer}
			>
				<Select.Trigger aria-label="Clip layer" className="clip-layer-trigger">
					<span className="clip-layer-name">
						{source === null ? NO_PICK : layerEntry(source).label}
					</span>
					<span aria-hidden="true" className="unit-chevron">
						<Icon name="chevron" />
					</span>
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner alignItemWithTrigger={false} side="bottom" sideOffset={MENU_GAP}>
						<Select.Popup className="unit-menu">
							{candidates.map((candidate) => (
								<Select.Item className="unit-item" key={candidate.id} value={candidate.id}>
									<Select.ItemText>{layerEntry(candidate).label}</Select.ItemText>
									<Select.ItemIndicator className="unit-mark">
										<Icon name="check" />
									</Select.ItemIndicator>
								</Select.Item>
							))}
						</Select.Popup>
					</Select.Positioner>
				</Select.Portal>
			</Select.Root>
		</div>
	);
}

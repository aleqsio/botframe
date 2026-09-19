import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Guide } from "../../../document/guides";
import type { Layer } from "../../../document/layer";
import { Icon } from "../Icon";
import { LayerChip } from "./LayerChip";
import {
	GUIDE_AXES,
	GUIDE_LABELS,
	GUIDE_MESSAGE,
	addedGuide,
	guideField,
	removedGuide,
} from "./guideFields";

function GuideRow({
	doc,
	guide,
	index,
	layer,
}: {
	doc: DesignDocument;
	guide: Guide;
	index: number;
	layer: Layer;
}): ReactElement {
	return (
		<div className="guide-row">
			<LayerChip doc={doc} field={guideField(layer, index, guide)} layer={layer} />
			<button
				aria-label="Remove guide"
				className="guide-button"
				onClick={() => {
					doc.update(layer.id, removedGuide(layer, index));
					doc.commit(GUIDE_MESSAGE);
				}}
				type="button"
			>
				<Icon name="minus" />
			</button>
		</div>
	);
}

export function GuideList({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	return (
		<div className="field-group layout-section">
			<span className="group-label">Guides</span>
			{Array.from(layer.guides.entries(), ([index, guide]) => (
				<GuideRow doc={doc} guide={guide} index={index} key={index} layer={layer} />
			))}
			<div className="chip-row">
				{GUIDE_AXES.map((axis) => (
					<button
						className="guide-button guide-add"
						key={axis}
						onClick={() => {
							doc.update(layer.id, addedGuide(layer, axis));
							doc.commit(GUIDE_MESSAGE);
						}}
						type="button"
					>
						<Icon name="plus" />
						{GUIDE_LABELS[axis]}
					</button>
				))}
			</div>
		</div>
	);
}

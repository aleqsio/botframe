import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import type { GuideAxis } from "../../document/layout";
import { LayerChip } from "./ChipGroup";
import { Icon } from "./Icon";
import { GUIDE_LABELS, GUIDE_MESSAGE, addedGuide, guideField, removedGuide } from "./layoutFields";

const AXES: readonly GuideAxis[] = ["x", "y"];

function GuideRow({
	doc,
	index,
	layer,
}: {
	doc: DesignDocument;
	index: number;
	layer: Layer;
}): ReactElement {
	return (
		<div className="guide-row">
			<LayerChip doc={doc} field={guideField(layer, index)} layer={layer} />
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
		<div className="field-group">
			<span className="group-label">Guides</span>
			{Array.from(layer.guides.keys(), (index) => (
				<GuideRow doc={doc} index={index} key={index} layer={layer} />
			))}
			<div className="chip-row">
				{AXES.map((axis) => (
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

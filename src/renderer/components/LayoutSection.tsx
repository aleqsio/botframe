import type { ReactElement } from "react";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { ChipGroup } from "./ChipGroup";
import { Segmented } from "./Segmented";
import {
	DIRECTIONS,
	LAYOUT_KINDS,
	LAYOUT_MESSAGE,
	layoutGroupsOf,
	layoutWithKind,
} from "./layoutFields";

export function LayoutSection({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { layout } = layer;

	return (
		<div className="field-group">
			<span className="group-label">Layout</span>
			<Segmented
				label="Layout"
				onPick={(kind) => {
					doc.update(layer.id, { layout: layoutWithKind(layout, kind) });
					doc.commit(LAYOUT_MESSAGE);
				}}
				options={LAYOUT_KINDS}
				value={layout.kind}
			/>
			{layout.kind === "flex" ? (
				<Segmented
					label="Direction"
					onPick={(direction) => {
						doc.update(layer.id, { layout: { ...layout, direction } });
						doc.commit(LAYOUT_MESSAGE);
					}}
					options={DIRECTIONS}
					value={layout.direction}
				/>
			) : null}
			{layoutGroupsOf(layout).map((group) => (
				<ChipGroup doc={doc} group={group} key={group.name} layer={layer} />
			))}
		</div>
	);
}

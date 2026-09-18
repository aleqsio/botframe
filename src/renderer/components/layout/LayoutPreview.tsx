import type { ReactElement } from "react";
import type { LayerLayout } from "../../../document/layout";
import {
	PACKED_COUNT,
	WRAPPED_COUNT,
	blockSize,
	isWrapped,
	previewCaption,
	previewCellStyle,
	previewStyle,
} from "./previewStyle";

function counted(length: number): readonly number[] {
	return Array.from({ length }, (_unused, index) => index);
}

function GridItems({ layout }: { layout: LayerLayout }): ReactElement {
	const cells = layout.tracks.columns.length * layout.tracks.rows.length;
	const style = previewCellStyle(layout);

	return (
		<>
			{counted(cells).map((cell) => (
				<span className="layout-prev-cell" key={cell} style={style}>
					<i className="layout-prev-item" />
				</span>
			))}
		</>
	);
}

function BlockItems({ layout }: { layout: LayerLayout }): ReactElement {
	const count = isWrapped(layout) ? WRAPPED_COUNT : PACKED_COUNT;

	return (
		<>
			{counted(count).map((block) => (
				<span className="layout-prev-block" key={block} style={blockSize(layout, block)} />
			))}
		</>
	);
}

export function LayoutPreview({ layout }: { layout: LayerLayout }): ReactElement {
	return (
		<div className="layout-prevwrap">
			<div className="layout-prev" style={previewStyle(layout)}>
				{layout.display === "grid" ? <GridItems layout={layout} /> : <BlockItems layout={layout} />}
			</div>
			<span className="layout-prevcap">{previewCaption(layout)}</span>
		</div>
	);
}

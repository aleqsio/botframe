import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { SPACING_UNITS } from "../../../document/layout";
import type { Spacing } from "../../../document/layout";
import { LengthField } from "./LengthField";
import { isWrapped } from "./previewStyle";

function GapRow({
	label,
	onChange,
	value,
}: {
	label: string;
	onChange: (next: Spacing) => void;
	value: Spacing;
}): ReactElement {
	return (
		<div className="layout-row">
			<span className="property-label layout-row-label">{label}</span>
			<LengthField label={label} onChange={onChange} units={SPACING_UNITS} value={value} />
		</div>
	);
}

export function GapFields({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { gap } = layer.layout;
	const twoAxes = isWrapped(layer.layout) || layer.layout.display === "grid";
	const write = (next: typeof gap): void => {
		doc.update(layer.id, { layout: { gap: next } });
		doc.commit("set gap");
	};

	return (
		<>
			<GapRow
				label="Gap"
				onChange={(next) => {
					write({ ...gap, column: next });
				}}
				value={gap.column}
			/>
			{twoAxes ? (
				<GapRow
					label="Row gap"
					onChange={(next) => {
						write({ ...gap, row: next });
					}}
					value={gap.row}
				/>
			) : null}
		</>
	);
}

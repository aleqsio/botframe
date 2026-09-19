import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { SPACING_UNITS } from "../../../document/layout";
import type { Spacing } from "../../../document/layout";
import { LengthField } from "./LengthField";
import { isWrapped } from "./previewStyle";

const GAP_MIN = 0;

function GapRow({
	label,
	onChange,
	onCommit,
	value,
}: {
	label: string;
	onChange: (next: Spacing) => void;
	onCommit: () => void;
	value: Spacing;
}): ReactElement {
	return (
		<LengthField
			label={label}
			min={GAP_MIN}
			onChange={onChange}
			onCommit={onCommit}
			text={label}
			units={SPACING_UNITS}
			value={value}
		/>
	);
}

export function GapFields({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const { gap } = layer.layout;
	const twoAxes = isWrapped(layer.layout) || layer.layout.display === "grid";
	const write = (next: typeof gap): void => {
		doc.update(layer.id, { layout: { gap: next } });
	};
	const commit = (): void => {
		doc.commit("set gap");
	};

	return (
		<>
			<GapRow
				label="Gap"
				onChange={(next) => {
					write({ ...gap, column: next });
				}}
				onCommit={commit}
				value={gap.column}
			/>
			{twoAxes ? (
				<GapRow
					label="Row gap"
					onChange={(next) => {
						write({ ...gap, row: next });
					}}
					onCommit={commit}
					value={gap.row}
				/>
			) : null}
		</>
	);
}

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import { SPACING_UNITS } from "../../../document/layout";
import type { LayerLayout, SpacingUnit } from "../../../document/layout";
import { LengthField } from "./LengthField";
import { SidesIcon } from "./LayoutIcons";
import { SideFields } from "./SideFields";
import { PERCENT_TIP } from "./selfText";
import { ChangedMark } from "../ChangedMark";

const PADDING_TIPS: Partial<Record<SpacingUnit, string>> = { "%": PERCENT_TIP };
const OPEN_TIP = "Individual sides";
const CLOSE_TIP = "Single value";
const ALL_SIDES = "All sides";
const PADDING_MIN = 0;

type Padding = LayerLayout["padding"];

function SidesToggle({ onToggle, open }: { onToggle: () => void; open: boolean }): ReactElement {
	return (
		<button
			aria-label={open ? CLOSE_TIP : OPEN_TIP}
			aria-pressed={open}
			className="layout-toggle"
			onClick={onToggle}
			title={open ? CLOSE_TIP : OPEN_TIP}
			type="button"
		>
			<SidesIcon />
		</button>
	);
}

function PaddingBox({
	children,
	onChange,
	onCommit,
	values,
}: {
	children: ReactNode;
	onChange: (next: Padding) => void;
	onCommit: () => void;
	values: Padding;
}): ReactElement {
	return (
		<div className="layout-pad-box">
			<SideFields
				group="Padding"
				min={PADDING_MIN}
				onChange={(side, next) => {
					onChange({ ...values, [side]: next });
				}}
				onCommit={onCommit}
				tips={PADDING_TIPS}
				units={SPACING_UNITS}
				values={values}
			/>
			{children}
		</div>
	);
}

export function PaddingSection({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const { padding } = layer.layout;
	const write = (next: Padding): void => {
		doc.update(layer.id, { layout: { padding: next } });
	};
	const commit = (): void => {
		doc.commit("set padding");
	};
	const toggle = (
		<SidesToggle
			onToggle={() => {
				setOpen(!open);
			}}
			open={open}
		/>
	);

	return (
		<section className="layout-section">
			<span className="group-label">Padding</span>
			<ChangedMark changed={isChanged(layer, "layout.padding")}>
				{open ? (
					<PaddingBox onChange={write} onCommit={commit} values={padding}>
						{toggle}
					</PaddingBox>
				) : (
					<div className="layout-row layout-pad-row">
						<LengthField
							label="Padding"
							min={PADDING_MIN}
							onChange={(next) => {
								write({ top: next, right: next, bottom: next, left: next });
							}}
							onCommit={commit}
							text={ALL_SIDES}
							tips={PADDING_TIPS}
							units={SPACING_UNITS}
							value={padding.top}
						/>
						{toggle}
					</div>
				)}
			</ChangedMark>
		</section>
	);
}

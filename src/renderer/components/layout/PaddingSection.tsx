import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { SPACING_UNITS } from "../../../document/layout";
import type { SpacingUnit } from "../../../document/layout";
import { LengthField } from "./LengthField";
import { PaddingIcon, SidesIcon } from "./LayoutIcons";
import { SideFields } from "./SideFields";
import { spreadSides } from "./paddingForm";
import type { Sides } from "./paddingForm";
import { PERCENT_TIP } from "./selfText";

const PADDING_TIPS: Partial<Record<SpacingUnit, string>> = { "%": PERCENT_TIP };
const OPEN_TIP = "Individual sides";
const CLOSE_TIP = "Single value";

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
	onChange,
	values,
}: {
	onChange: (next: Sides) => void;
	values: Sides;
}): ReactElement {
	return (
		<div className="layout-pad-box">
			<span className="layout-pad-label">padding</span>
			<SideFields
				group="Padding"
				onChange={(side, next) => {
					onChange({ ...values, [side]: next });
				}}
				tips={PADDING_TIPS}
				units={SPACING_UNITS}
				values={values}
			/>
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
	const write = (next: Sides): void => {
		doc.update(layer.id, { layout: { padding: next } });
		doc.commit("set padding");
	};

	return (
		<section className="layout-section">
			<span className="group-label">Padding</span>
			<div className="layout-row layout-pad-row">
				<span className="property-label layout-row-label">
					<PaddingIcon />
					Sides
				</span>
				{open ? (
					<span className="layout-spacer" />
				) : (
					<LengthField
						label="Padding"
						onChange={(next) => {
							write(spreadSides(next));
						}}
						tips={PADDING_TIPS}
						units={SPACING_UNITS}
						value={padding.top}
					/>
				)}
				<SidesToggle
					onToggle={() => {
						setOpen(!open);
					}}
					open={open}
				/>
			</div>
			{open ? <PaddingBox onChange={write} values={padding} /> : null}
		</section>
	);
}

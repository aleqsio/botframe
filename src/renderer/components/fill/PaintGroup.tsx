import type { ReactElement } from "react";
import { AddMenu } from "../variables/AddMenu";
import type { AddChoice } from "../variables/AddMenu";
import { colorSwatches } from "./DocumentPaints";
import { addPaintVariable } from "./libraryActions";
import { PaintCard } from "./PaintCard";
import type { CardProps } from "./PaintCard";

type GroupProps = CardProps & { onAdded: (id: string) => void };

function paintChoices(props: GroupProps): readonly AddChoice[] {
	return [
		{
			name: "Color",
			icon: "ellipse",
			pick: () => {
				props.onAdded(addPaintVariable(props.doc, "solid"));
			},
		},
		{
			name: "Gradient",
			icon: "gradient",
			pick: () => {
				props.onAdded(addPaintVariable(props.doc, "gradient"));
			},
		},
	];
}

export function PaintGroup(props: GroupProps): ReactElement {
	const swatches = colorSwatches({ view: props.view, source: props.doc.tree.resolver() });
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">Fills</span>
				<AddMenu choices={paintChoices(props)} compact label="Add document fill" />
			</div>
			{swatches.length === 0 ? (
				<p className="fill-group-note">No fills.</p>
			) : (
				<ul className="fill-cards">
					{swatches.map((swatch) => (
						<PaintCard {...props} key={swatch.key} swatch={swatch} />
					))}
				</ul>
			)}
		</div>
	);
}

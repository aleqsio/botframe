import type { ReactElement } from "react";
import { AddMenu } from "../variables/AddMenu";
import type { AddChoice } from "../variables/AddMenu";
import { colorSwatches } from "./DocumentPaints";
import { addPaintVariable } from "./libraryActions";
import { PaintCard } from "./PaintCard";
import type { CardProps } from "./PaintCard";

function paintChoices(props: CardProps): readonly AddChoice[] {
	return [
		{
			name: "Color",
			icon: "ellipse",
			add: () => addPaintVariable(props.doc, "solid"),
		},
		{
			name: "Gradient",
			icon: "gradient",
			add: () => addPaintVariable(props.doc, "gradient"),
		},
	];
}

export function PaintGroup(props: CardProps & { onAdded: (id: string) => void }): ReactElement {
	const swatches = colorSwatches({ view: props.view, source: props.doc.tree.resolver() });
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">Colors and gradients</span>
				<AddMenu choices={paintChoices(props)} label="Add color" onAdded={props.onAdded} />
			</div>
			{swatches.length === 0 ? (
				<p className="component-note">No colors.</p>
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

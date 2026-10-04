import { useState } from "react";
import type { ReactElement } from "react";
import { gradientText } from "../../../document/paint";
import type { Gradient } from "../../../document/paint";
import type { EditTarget } from "../variables/target";
import { DocumentPaints, documentSwatches } from "./DocumentPaints";
import { GradientBar, StopColor } from "./GradientBar";
import { ShapeRows } from "./ShapeRows";
import type { PaintEdit } from "./paintEdit";
import { StopList } from "./StopList";

export function GradientTab({
	edit,
	gradient,
	target,
}: {
	edit: PaintEdit;
	gradient: Gradient;
	target: EditTarget | null;
}): ReactElement {
	const [picked, setPicked] = useState(0);
	const selected = Math.min(picked, gradient.stops.length - 1);
	const swatches = target === null ? [] : documentSwatches(target.reach.view, "gradient");

	function write(next: Gradient): void {
		edit.change(gradientText(next));
	}

	const pick = { gradient, selected, onSelect: setPicked };
	return (
		<>
			<ShapeRows gradient={gradient} onCommit={edit.commit} onWrite={write} />
			<GradientBar
				{...pick}
				onCommit={edit.commit}
				onWrite={(edited) => {
					setPicked(edited.index);
					write(edited.gradient);
				}}
			/>
			<StopList {...pick} onCommit={edit.commit} onWrite={write} />
			<StopColor {...pick} onCommit={edit.commit} onWrite={write} />
			{target === null || swatches.length === 0 ? null : (
				<DocumentPaints label="Document gradients" swatches={swatches} target={target} />
			)}
		</>
	);
}

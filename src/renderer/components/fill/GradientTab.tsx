import { useState } from "react";
import type { ReactElement } from "react";
import { gradientText } from "../../../document/paint";
import type { Gradient } from "../../../document/paint";
import { GradientBar } from "./GradientBar";
import type { StopPick } from "./GradientBar";
import { ShapeRows } from "./ShapeRows";
import type { PaintEdit } from "./paintEdit";
import { StopList } from "./StopList";
import { stopRecolored } from "./stops";
import { ColorPicker } from "../ColorPicker";
import { BLACK, formatColor, parseColor } from "../color";

function StopColor({
	gradient,
	onCommit,
	onWrite,
	selected,
}: StopPick & { onWrite: (gradient: Gradient) => void; onCommit: () => void }): ReactElement {
	return (
		<ColorPicker
			color={parseColor(gradient.stops[selected]?.color ?? "") ?? BLACK}
			onChange={(next) => {
				onWrite(stopRecolored(gradient, selected, formatColor(next)));
			}}
			onCommit={onCommit}
		/>
	);
}

export function GradientTab({
	edit,
	gradient,
}: {
	edit: PaintEdit;
	gradient: Gradient;
}): ReactElement {
	const [picked, setPicked] = useState(0);
	const selected = Math.min(picked, gradient.stops.length - 1);

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
		</>
	);
}

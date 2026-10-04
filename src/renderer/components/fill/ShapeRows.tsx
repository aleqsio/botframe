import type { ReactElement } from "react";
import { GRADIENT_SHAPES } from "../../../document/paint";
import type { Gradient, GradientShape } from "../../../document/paint";
import { DraftInput } from "../PropertyField";
import { Segmented } from "../layout/Segmented";
import { numberIn } from "../numberValue";
import { IconButton } from "./IconButton";

const FULL_TURN = 360;
const QUARTER_TURN = 90;

const SHAPE_LABELS: Readonly<Record<GradientShape, string>> = {
	linear: "Linear",
	radial: "Radial",
	conic: "Conic",
};

const SHAPE_OPTIONS = GRADIENT_SHAPES.map((shape) => ({
	value: shape,
	label: SHAPE_LABELS[shape],
}));

export function gradientSummary(gradient: Gradient): string {
	return `${SHAPE_LABELS[gradient.shape]} · ${gradient.stops.length} stops`;
}

function turned(angle: number): number {
	return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

function AngleRow({
	gradient,
	onSet,
}: {
	gradient: Gradient;
	onSet: (next: Gradient) => void;
}): ReactElement {
	const off = gradient.shape === "radial";
	return (
		<div className="guide-row">
			<div className="property-field angle-field" data-disabled={off ? "" : undefined}>
				<span className="property-label">Angle</span>
				<DraftInput
					disabled={off}
					inputMode="numeric"
					label="Angle"
					onCommit={(text) => {
						const angle = numberIn(text);
						if (angle !== null) {
							onSet({ ...gradient, angle: turned(angle) });
						}
					}}
					value={`${gradient.angle}°`}
				/>
			</div>
			<IconButton
				disabled={off}
				icon="turnCw"
				label="Rotate 90°"
				onClick={() => {
					onSet({ ...gradient, angle: turned(gradient.angle + QUARTER_TURN) });
				}}
			/>
		</div>
	);
}

export function ShapeRows({
	gradient,
	onSet,
}: {
	gradient: Gradient;
	onSet: (next: Gradient) => void;
}): ReactElement {
	return (
		<>
			<Segmented
				label="Gradient shape"
				onPick={(shape) => {
					onSet({ ...gradient, shape });
				}}
				options={SHAPE_OPTIONS}
				value={gradient.shape}
			/>
			<AngleRow gradient={gradient} onSet={onSet} />
		</>
	);
}

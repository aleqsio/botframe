import type { ReactElement } from "react";
import { GRADIENT_SHAPES, withShape } from "../../../document/paint";
import type { Gradient } from "../../../document/paint";
import { ANGLE_STEP } from "../../input/step";
import { Segmented } from "../layout/Segmented";
import { NumberChip } from "../layout/NumberChip";
import { IconButton } from "./IconButton";
import { SHAPE_LABELS } from "./stops";

const FULL_TURN = 360;
const QUARTER_TURN = 90;

const SHAPE_OPTIONS = GRADIENT_SHAPES.map((shape) => ({
	value: shape,
	label: SHAPE_LABELS[shape],
}));

function turned(angle: number): number {
	return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

interface GradientChange {
	gradient: Gradient;
	onWrite: (next: Gradient) => void;
	onCommit: () => void;
}

type AngledGradient = Exclude<Gradient, { shape: "radial" }>;

function AngleRow({
	gradient,
	onCommit,
	onWrite,
}: GradientChange & { gradient: AngledGradient }): ReactElement {
	return (
		<div className="guide-row angle-row">
			<NumberChip
				bound={{ kind: "wrap", min: 0, max: FULL_TURN }}
				label="Angle"
				name="Angle"
				onCommit={onCommit}
				onValue={(angle) => {
					onWrite({ ...gradient, angle });
				}}
				step={ANGLE_STEP}
				unit="°"
				value={gradient.angle}
			/>
			<IconButton
				icon="turnCw"
				label="Rotate 90°"
				onClick={() => {
					onWrite({ ...gradient, angle: turned(gradient.angle + QUARTER_TURN) });
					onCommit();
				}}
			/>
		</div>
	);
}

export function ShapeRows(props: GradientChange): ReactElement {
	const { gradient, onCommit, onWrite } = props;
	return (
		<>
			<Segmented
				label="Gradient shape"
				onPick={(shape) => {
					onWrite(withShape(gradient, shape));
					onCommit();
				}}
				options={SHAPE_OPTIONS}
				value={gradient.shape}
			/>
			{gradient.shape === "radial" ? null : <AngleRow {...props} gradient={gradient} />}
		</>
	);
}

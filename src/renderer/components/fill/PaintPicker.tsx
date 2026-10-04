import type { ReactElement } from "react";
import { paintOf } from "../../../document/paint";
import type { Paint } from "../../../document/paint";
import type { EditTarget } from "../variables/target";
import { FillTabs } from "./FillTabs";
import { GradientTab } from "./GradientTab";
import type { PaintEdit } from "./paintEdit";
import { SolidTab } from "./SolidTab";

interface PaintProps {
	edit: PaintEdit;
	target: EditTarget | null;
}

export function PaintBody({ edit, paint, target }: PaintProps & { paint: Paint }): ReactElement {
	return paint.kind === "solid" ? (
		<SolidTab color={paint.color} edit={edit} target={target} />
	) : (
		<GradientTab edit={edit} gradient={paint.gradient} target={target} />
	);
}

export function PaintPicker({ edit, target }: PaintProps): ReactElement {
	const paint = paintOf(edit.value);
	return (
		<>
			<FillTabs edit={edit} media={null} paint={paint} />
			<PaintBody edit={edit} paint={paint} target={target} />
		</>
	);
}

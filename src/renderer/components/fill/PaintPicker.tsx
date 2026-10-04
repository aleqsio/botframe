import type { ReactElement } from "react";
import { paintOf } from "../../../document/paint";
import type { Paint } from "../../../document/paint";
import type { EditTarget } from "../variables/target";
import { DocumentPaints, documentSwatches } from "./DocumentPaints";
import { FillTabs } from "./FillTabs";
import { GradientTab } from "./GradientTab";
import type { PaintEdit } from "./paintEdit";
import { SolidTab } from "./SolidTab";

interface PaintProps {
	edit: PaintEdit;
	target: EditTarget | null;
}

export function PaintBody({ edit, paint, target }: PaintProps & { paint: Paint }): ReactElement {
	if (paint.kind === "custom") {
		return <code className="layout-note">{paint.text}</code>;
	}
	if (paint.kind === "solid") {
		return <SolidTab color={paint.color} edit={edit} target={target} />;
	}
	const swatches = target === null ? [] : documentSwatches(target.reach, "gradient");
	return (
		<>
			<GradientTab edit={edit} gradient={paint.gradient} />
			{target === null || swatches.length === 0 ? null : (
				<DocumentPaints label="Document gradients" swatches={swatches} target={target} />
			)}
		</>
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

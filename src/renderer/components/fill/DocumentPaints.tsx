import type { ReactElement } from "react";
import { paintOf } from "../../../document/paint";
import type { EditableKind } from "../../../document/paint";
import { resolveValue } from "../../../document/resolve";
import { isReference } from "../../../document/value";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Reach } from "../variables/reach";
import type { EditTarget } from "../variables/target";
import { SwatchGrid } from "./SwatchGrid";
import type { Swatch } from "./SwatchGrid";

type PaintReach = Pick<Reach, "view" | "source">;

export function colorSwatches({ source, view }: PaintReach): readonly Swatch[] {
	return view.variables(DOCUMENT_SCOPE).flatMap((variable) => {
		if (variable.type !== "color") {
			return [];
		}
		const paint = resolveValue(source, variable.initial, []);
		return [
			{ key: variable.id, label: variable.name, paint: typeof paint === "string" ? paint : "" },
		];
	});
}

export function documentSwatches(reach: PaintReach, kind: EditableKind): readonly Swatch[] {
	return colorSwatches(reach).filter((swatch) => paintOf(swatch.paint).kind === kind);
}

export function DocumentPaints({
	label,
	swatches,
	target,
}: {
	label: string;
	swatches: readonly Swatch[];
	target: EditTarget;
}): ReactElement {
	const { value } = target;
	return (
		<div className="fill-part">
			<span className="layout-sub">{label}</span>
			<SwatchGrid
				label={label}
				onPick={(swatch) => {
					target.onChange({ var: swatch.key });
				}}
				picked={isReference(value) ? value.var : null}
				swatches={swatches}
			/>
		</div>
	);
}

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

export function documentSwatches(
	{ source, view }: Pick<Reach, "view" | "source">,
	kind: EditableKind,
): readonly Swatch[] {
	return view.variables(DOCUMENT_SCOPE).flatMap((variable) => {
		const paint = resolveValue(source, variable.initial, []);
		const fits = variable.type === "color" && typeof paint === "string";
		return fits && paintOf(paint).kind === kind
			? [{ key: variable.id, label: variable.name, paint }]
			: [];
	});
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

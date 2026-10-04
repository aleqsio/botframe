import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import { paintOf } from "../../../document/paint";
import type { Paint } from "../../../document/paint";
import { isReference } from "../../../document/value";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { EditTarget } from "../variables/target";
import { SwatchGrid } from "./SwatchGrid";
import type { Swatch } from "./SwatchGrid";

export function documentSwatches(view: ComponentsView, kind: Paint["kind"]): readonly Swatch[] {
	return view.variables(DOCUMENT_SCOPE).flatMap((variable) => {
		const { initial } = variable;
		const fits = variable.type === "color" && typeof initial === "string";
		return fits && paintOf(initial).kind === kind
			? [{ key: variable.id, label: variable.name, paint: initial }]
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

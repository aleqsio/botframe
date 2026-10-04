import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { isChanged } from "../../../document/layer";
import type { Layer } from "../../../document/layer";
import { BindButton } from "./BindButton";
import { BoundSummary } from "./BoundSummary";
import { useLayerTarget } from "./layerTarget";

interface FieldProps {
	doc: DesignDocument;
	layer: Layer;
}

export function ClipField({ doc, layer }: FieldProps): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: "clip",
		label: "Clip content",
		plain: (value) => (typeof value === "boolean" ? { clip: value } : null),
	});
	const bound = layer.bindings.clip;

	return (
		<div className="property-switch-row" data-changed={isChanged(layer, "clip") ? "" : undefined}>
			{bound === undefined ? (
				<label className="property-switch">
					<input
						checked={layer.clip}
						onChange={(event) => {
							target.onChange(event.target.checked);
						}}
						type="checkbox"
					/>
					Clip content
				</label>
			) : (
				<BoundSummary bound={bound} now={layer.clip} view={target.reach.view} />
			)}
			<BindButton target={target} />
		</div>
	);
}

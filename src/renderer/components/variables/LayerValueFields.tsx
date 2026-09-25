import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { ColorField } from "../ColorField";
import { BindButton } from "./BindButton";
import { BoundSummary } from "./BoundSummary";
import { useLayerTarget } from "./layerTarget";

interface FieldProps {
	doc: DesignDocument;
	layer: Layer;
}

export function FillField({ doc, layer }: FieldProps): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: "fill",
		label: "Fill",
		plain: (value) => (typeof value === "string" ? { fill: value } : null),
	});
	const bound = layer.bindings.fill;

	return (
		<ColorField
			after={<BindButton target={target} />}
			replace={
				bound === undefined ? undefined : (
					<BoundSummary bound={bound} now={layer.fill} view={target.reach.view} />
				)
			}
			label="Fill"
			onChange={(text) => {
				doc.update(layer.id, { fill: text });
			}}
			onCommit={() => {
				doc.commit("set fill");
			}}
			value={layer.fill}
		/>
	);
}

export function ClipField({ doc, layer }: FieldProps): ReactElement {
	const target = useLayerTarget(doc, layer, {
		key: "clip",
		label: "Clip content",
		plain: (value) => (typeof value === "boolean" ? { clip: value } : null),
	});
	const bound = layer.bindings.clip;

	return (
		<div className="property-switch-row">
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

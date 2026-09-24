import type { ReactElement } from "react";
import { propValuesOf } from "../../document/component";
import type { PropSpec, PropValue } from "../../document/component";
import type { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { useComponent } from "../useDocument";
import { Icon } from "./Icon";
import { PropertyField } from "./PropertyField";

const PROP_MESSAGE = "set prop";

function PropControl({
	spec,
	value,
	onPick,
}: {
	spec: PropSpec;
	value: PropValue | undefined;
	onPick: (value: PropValue) => void;
}): ReactElement {
	if (spec.kind === "boolean") {
		return (
			<label className="property-switch">
				<input
					checked={value === true}
					onChange={(event) => {
						onPick(event.target.checked);
					}}
					type="checkbox"
				/>
				{spec.name}
			</label>
		);
	}
	if (spec.kind === "choice") {
		return (
			<label className="property-field">
				<span className="property-label">{spec.name}</span>
				<select
					className="property-input prop-choice"
					onChange={(event) => {
						onPick(event.target.value);
					}}
					value={String(value)}
				>
					{spec.options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
				<span className="footer-chevron">
					<Icon name="chevron" />
				</span>
			</label>
		);
	}
	return <PropertyField label={spec.name} onCommit={onPick} value={String(value)} />;
}

export function ComponentProps({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement | null {
	const { content } = layer;
	const component = useComponent(doc, content.kind === "component" ? content.component : null);

	if (content.kind !== "component" || component === null || component.props.length === 0) {
		return null;
	}
	const values = propValuesOf(component, content.props);

	return (
		<div className="field-group layout-section">
			<span className="group-label">Props</span>
			{component.props.map((spec) => (
				<PropControl
					key={spec.name}
					onPick={(value) => {
						doc.update(layer.id, { props: { [spec.name]: value } });
						doc.commit(PROP_MESSAGE);
					}}
					spec={spec}
					value={values[spec.name]}
				/>
			))}
		</div>
	);
}

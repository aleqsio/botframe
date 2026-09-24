import type { ReactElement } from "react";
import { BINDING_KEYS, BINDING_TYPES, isPlacementBinding } from "../../../document/bindings";
import type { BindingKey } from "../../../document/bindings";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Layer, LayerId } from "../../../document/layer";
import { VariablePicker, choicesAt } from "./VariablePicker";
import { useComponentsView } from "../../useDocument";
import { ownersAt, sourceOf, traceAt } from "./sourceText";

const MESSAGE = "bind a field";

const LABELS: Readonly<Record<BindingKey, string>> = {
	fill: "Fill",
	x: "X",
	y: "Y",
	width: "Width",
	height: "Height",
	rotation: "Rotation",
	cornerRadius: "Radius",
	cornerSmoothing: "Smoothing",
	clip: "Clip",
};

const CORNER_KEYS: ReadonlySet<BindingKey> = new Set(["cornerRadius", "cornerSmoothing"]);

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	layer: Layer;
	field: BindingKey;
	onSelect: (id: LayerId) => void;
}

function SourceLine({ doc, field, layer, onSelect, view }: RowProps): ReactElement | null {
	const variable = layer.bindings[field];
	const found =
		variable === undefined ? null : traceAt(doc, layer, variable, isPlacementBinding(field));
	if (found === null) {
		return null;
	}
	const source = sourceOf(doc, view, layer.id, found);
	const { layer: origin } = source;
	return origin === null ? (
		<span className="source-line">{source.text}</span>
	) : (
		<button
			className="source-line source-link"
			onClick={() => {
				onSelect(origin);
			}}
			type="button"
		>
			{source.text}
		</button>
	);
}

function BindingRow(props: RowProps): ReactElement {
	const { doc, field, layer, view } = props;
	const variable = layer.bindings[field];
	const owners = ownersAt(doc, layer, isPlacementBinding(field));
	const name = variable === undefined ? null : view.declared(variable)?.variable.name;

	return (
		<div className="variable-row">
			<div className="variable-head">
				<span className="property-label binding-label">{LABELS[field]}</span>
				<span className="variable-name">{name ?? "No variable"}</span>
				<VariablePicker
					bound={variable !== undefined}
					choices={choicesAt(view, owners, BINDING_TYPES[field])}
					view={view}
					label={LABELS[field]}
					onPick={(picked) => {
						doc.update(layer.id, { bindings: { [field]: picked } });
						doc.commit(MESSAGE);
					}}
				/>
			</div>
			<SourceLine {...props} />
		</div>
	);
}

export function BindingsSection({
	doc,
	layer,
	onSelect,
}: {
	doc: DesignDocument;
	layer: Layer;
	onSelect: (id: LayerId) => void;
}): ReactElement {
	const view = useComponentsView(doc);
	const corners = layer.geometry.kind === "rectangle";
	const fields = BINDING_KEYS.filter((field) => corners || !CORNER_KEYS.has(field));

	return (
		<div className="field-group layout-section">
			<span className="group-label">Variables in fields</span>
			{fields.map((field) => (
				<BindingRow
					doc={doc}
					field={field}
					key={field}
					layer={layer}
					onSelect={onSelect}
					view={view}
				/>
			))}
		</div>
	);
}

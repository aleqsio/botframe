import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { isLiteral } from "../../../document/value";
import type { VariableValue } from "../../../document/value";
import { emptyValue } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { useComponentsView } from "../../useDocument";
import { ValueControl } from "./ValueControl";

const MESSAGE = "set prop";

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	layer: Layer;
	variable: Variable;
	owners: readonly string[];
}

function currentOf(layer: Layer, variable: Variable): string | number | boolean {
	const resolved =
		layer.content.kind === "component" ? layer.content.values[variable.id] : undefined;
	if (resolved !== undefined) {
		return resolved;
	}
	const { initial, options, type } = variable;
	return isLiteral(initial) ? initial : emptyValue(type, options);
}

function PropRow({ doc, layer, owners, variable, view }: RowProps): ReactElement {
	const held = layer.content.kind === "component" ? layer.content.props[variable.id] : undefined;
	const current = currentOf(layer, variable);
	const write = (value: Readonly<Record<string, VariableValue | null>>): void => {
		doc.update(layer.id, { props: value });
		doc.commit(MESSAGE);
	};

	return (
		<div className="prop-row">
			<span className="prop-name" data-dimmed={held === undefined ? "" : undefined}>
				{variable.name}
			</span>
			<ValueControl
				dimmed={held === undefined}
				target={{
					reach: { view, owners },
					label: variable.name,
					type: variable.type,
					options: variable.options,
					value: held ?? current,
					current,
					make: null,
					onChange: (next) => {
						write({ [variable.id]: next });
					},
				}}
			/>
			{held === undefined ? (
				<span className="prop-reset-gap" />
			) : (
				<button
					aria-label={`Reset ${variable.name}`}
					className="guide-button"
					onClick={() => {
						write({ [variable.id]: null });
					}}
					title="Use the default"
					type="button"
				>
					↺
				</button>
			)}
		</div>
	);
}

export function PropsSection({
	doc,
	layer,
}: {
	doc: DesignDocument;
	layer: Layer;
}): ReactElement | null {
	const view = useComponentsView(doc);
	if (layer.content.kind !== "component") {
		return null;
	}
	const variables = view.variables(layer.content.component);
	const owners = doc.tree.ownersAt(layer.id, true);

	return (
		<div className="field-group layout-section">
			<span className="group-label">Props · this copy</span>
			{variables.map((variable) => (
				<PropRow
					doc={doc}
					key={variable.id}
					layer={layer}
					owners={owners}
					variable={variable}
					view={view}
				/>
			))}
			{variables.length === 0 ? (
				<p className="component-note">Add a prop below. Then each copy can set it.</p>
			) : null}
		</div>
	);
}

import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import type { Variable, VariableValue } from "../../../document/variable";
import { Icon } from "../Icon";
import { useComponentsView } from "../../useDocument";
import { ValueField } from "./ValueField";
import { VariablePicker, choicesAt } from "./VariablePicker";
import { ownersAt, sourceOf, traceAt } from "./sourceText";

const MESSAGE = "set prop";

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	layer: Layer;
	variable: Variable;
	owners: readonly string[];
}

function assign(doc: DesignDocument, layer: Layer, id: string, value: VariableValue | null): void {
	doc.update(layer.id, { props: { [id]: value } });
}

function ResetButton({ doc, layer, variable }: RowProps): ReactElement {
	return (
		<button
			aria-label={`Reset ${variable.name}`}
			className="guide-button"
			onClick={() => {
				assign(doc, layer, variable.id, null);
				doc.commit(MESSAGE);
			}}
			type="button"
		>
			<Icon name="minus" />
		</button>
	);
}

function PropRow(props: RowProps): ReactElement {
	const { doc, layer, owners, variable, view } = props;
	const held = layer.content.kind === "component" ? layer.content.props[variable.id] : undefined;
	const found = traceAt(doc, layer, variable.id, false);

	return (
		<div className="variable-row">
			<div className="variable-head">
				<span className="variable-name">{variable.name}</span>
				{held === undefined ? null : <ResetButton {...props} />}
			</div>
			<ValueField
				dimmed={held === undefined}
				label={variable.name}
				onDone={() => {
					doc.commit(MESSAGE);
				}}
				onPick={(next) => {
					assign(doc, layer, variable.id, next);
				}}
				options={variable.options}
				owners={owners}
				type={variable.type}
				value={held ?? found?.value ?? variable.initial}
				view={view}
			/>
			{held === undefined && found !== null ? (
				<span className="source-line">{sourceOf(doc, view, layer.id, found).text}</span>
			) : null}
		</div>
	);
}

function rowsOf(view: ComponentsView, layer: Layer): readonly Variable[] {
	if (layer.content.kind !== "component") {
		return [];
	}
	const own = view.scope(layer.content.component).variables;
	const ids = new Set(own.map((variable) => variable.id));
	const outer = Object.keys(layer.content.props).flatMap((id) => {
		const declared = ids.has(id) ? null : view.declared(id);
		return declared === null ? [] : [declared.variable];
	});
	return [...own.filter((variable) => variable.prop), ...outer];
}

export function PropsSection({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const view = useComponentsView(doc);
	const owners = ownersAt(doc, layer, true);

	return (
		<div className="field-group layout-section">
			<span className="group-label">Props · this copy</span>
			{rowsOf(view, layer).map((variable) => (
				<PropRow
					doc={doc}
					key={variable.id}
					layer={layer}
					owners={owners}
					variable={variable}
					view={view}
				/>
			))}
			<div className="variable-head">
				<span className="property-label">Set variable…</span>
				<VariablePicker
					bound={false}
					choices={choicesAt(view, owners, null)}
					label="Set variable"
					onPick={(id) => {
						if (id !== null) {
							const found = traceAt(doc, layer, id, true);
							assign(doc, layer, id, found?.value ?? view.declared(id)?.variable.initial ?? "");
							doc.commit(MESSAGE);
						}
					}}
					view={view}
				/>
			</div>
		</div>
	);
}

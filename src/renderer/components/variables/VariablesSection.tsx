import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { isLiteral } from "../../../document/value";
import { DOCUMENT_SCOPE, emptyValue } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { DraftInput } from "../PropertyField";
import { useComponentsView } from "../../useDocument";
import { NewVariable, OptionChips, RemoveButton } from "./VariableParts";
import { editVariable, removeVariable, typeName } from "./scopeEdit";
import { ValueControl } from "./ValueControl";

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	locked: boolean;
}

function VariableHead({ doc, locked, owner, variable }: RowProps): ReactElement {
	return (
		<div className="variable-head">
			{locked ? (
				<span className="variable-name">{variable.name}</span>
			) : (
				<DraftInput
					inputMode="text"
					label={`${variable.name} name`}
					onCommit={(name) => {
						editVariable(doc, owner, variable, { name });
					}}
					value={variable.name}
				/>
			)}
			<span className="variable-type">{typeName(variable.type)}</span>
			{locked ? null : (
				<RemoveButton
					label={`Remove ${variable.name}`}
					onPress={() => {
						removeVariable(doc, owner, variable.id);
					}}
				/>
			)}
		</div>
	);
}

function VariableRow(props: RowProps): ReactElement {
	const { doc, locked, owner, variable, view } = props;
	const { initial, options, type } = variable;

	return (
		<div className="variable-row">
			<VariableHead {...props} />
			{type === "choice" ? (
				<OptionChips
					locked={locked}
					onChange={(next) => {
						editVariable(doc, owner, variable, { options: next });
					}}
					options={options}
				/>
			) : null}
			<div className="default-row">
				<span className="property-label">Default</span>
				<ValueControl
					target={{
						reach: { view, owners: owner === DOCUMENT_SCOPE ? [owner] : [DOCUMENT_SCOPE, owner] },
						label: `${variable.name} default`,
						type,
						options,
						value: initial,
						current: isLiteral(initial) ? initial : emptyValue(type, options),
						make: null,
						onChange: (next) => {
							editVariable(doc, owner, variable, { initial: next });
						},
					}}
				/>
			</div>
		</div>
	);
}

export function VariablesSection({
	doc,
	owner,
	title,
}: {
	doc: DesignDocument;
	owner: string;
	title: string;
}): ReactElement {
	const view = useComponentsView(doc);
	const locked = view.entry(owner)?.body.kind === "html";

	return (
		<div className="field-group layout-section">
			<span className="group-label">{title}</span>
			{view.variables(owner).map((variable) => (
				<VariableRow
					doc={doc}
					key={variable.id}
					locked={locked}
					owner={owner}
					variable={variable}
					view={view}
				/>
			))}
			{locked ? null : <NewVariable doc={doc} owner={owner} />}
		</div>
	);
}

import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE, VARIABLE_TYPES } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { useComponentsView } from "../../useDocument";
import { ChoiceTable } from "./ChoiceTable";
import { ValueField } from "./ValueField";
import {
	addVariable,
	commitVariables,
	editVariable,
	optionsOf,
	removeVariable,
	typeName,
} from "./scopeEdit";

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	variables: readonly Variable[];
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
						commitVariables(doc);
					}}
					value={variable.name}
				/>
			)}
			<span className="variable-type">{typeName(variable.type)}</span>
			{owner === DOCUMENT_SCOPE ? null : (
				<button
					aria-pressed={variable.prop}
					className="pill-button prop-toggle"
					disabled={locked}
					onClick={() => {
						editVariable(doc, owner, variable, { prop: !variable.prop });
						commitVariables(doc);
					}}
					type="button"
				>
					Prop
				</button>
			)}
			{locked ? null : (
				<button
					aria-label={`Remove ${variable.name}`}
					className="guide-button"
					onClick={() => {
						removeVariable(doc, owner, variable.id);
					}}
					type="button"
				>
					<Icon name="minus" />
				</button>
			)}
		</div>
	);
}

function VariableRow(props: RowProps): ReactElement {
	const { doc, locked, owner, variable, variables, view } = props;
	const owners = owner === DOCUMENT_SCOPE ? [DOCUMENT_SCOPE] : [DOCUMENT_SCOPE, owner];

	return (
		<div className="variable-row">
			<VariableHead {...props} />
			{variable.type === "choice" && !locked ? (
				<DraftInput
					inputMode="text"
					label={`${variable.name} options`}
					onCommit={(text) => {
						const options = optionsOf(text);
						if (options.length > 0) {
							editVariable(doc, owner, variable, { options });
							commitVariables(doc);
						}
					}}
					value={variable.options.join(", ")}
				/>
			) : null}
			<ValueField
				label={`${variable.name} default`}
				onDone={() => {
					commitVariables(doc);
				}}
				onPick={(initial) => {
					editVariable(doc, owner, variable, { initial });
				}}
				options={variable.options}
				owners={owners}
				type={variable.type}
				value={variable.initial}
				view={view}
			/>
			{variable.type === "choice" ? (
				<ChoiceTable
					choice={variable}
					doc={doc}
					owner={owner}
					owners={owners}
					variables={variables}
					view={view}
				/>
			) : null}
		</div>
	);
}

function AddVariable({ doc, owner }: { doc: DesignDocument; owner: string }): ReactElement {
	return (
		<select
			aria-label="Add a variable"
			className="property-input table-add"
			onChange={(event) => {
				const type = VARIABLE_TYPES.find((held) => held === event.target.value);
				if (type !== undefined) {
					addVariable(doc, owner, type);
				}
			}}
			value=""
		>
			<option value="">Add a variable</option>
			{VARIABLE_TYPES.map((type) => (
				<option key={type} value={type}>
					{typeName(type)}
				</option>
			))}
		</select>
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
	const { variables } = view.scope(owner);
	const locked = view.entry(owner)?.body.kind === "html";

	return (
		<div className="field-group layout-section">
			<span className="group-label">{title}</span>
			{variables.map((variable) => (
				<VariableRow
					doc={doc}
					key={variable.id}
					locked={locked}
					owner={owner}
					variable={variable}
					variables={variables}
					view={view}
				/>
			))}
			{locked ? null : <AddVariable doc={doc} owner={owner} />}
		</div>
	);
}

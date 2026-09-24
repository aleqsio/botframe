import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { cellIn, drivenIn, drivingIn } from "../../../document/scope";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { ValueField } from "./ValueField";
import { commitVariables, setCell } from "./scopeEdit";

interface TableProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	choice: Variable;
	variables: readonly Variable[];
	owners: readonly string[];
}

function DrivenRow({
	option,
	variable,
	...table
}: TableProps & { option: string; variable: Variable }): ReactElement {
	const { choice, doc, owner, owners, view } = table;
	const cell = { choice: choice.id, option, variable: variable.id };
	const held = cellIn(view.scope(owner), cell);

	return (
		<div className="table-row">
			<span className="property-label">{variable.name}</span>
			<ValueField
				dimmed={held === undefined}
				view={view}
				label={`${variable.name} for ${option}`}
				onDone={() => {
					commitVariables(doc);
				}}
				onPick={(value) => {
					setCell(doc, owner, cell, value);
				}}
				options={variable.options}
				owners={owners}
				type={variable.type}
				value={held ?? variable.initial}
			/>
			<button
				aria-label={`Take ${variable.name} out of the table`}
				className="guide-button"
				onClick={() => {
					doc.components.scope(owner).takeOut(choice.id, variable.id);
					commitVariables(doc);
				}}
				type="button"
			>
				<Icon name="minus" />
			</button>
		</div>
	);
}

function AddToTable({ option, ...table }: TableProps & { option: string }): ReactElement {
	const { choice, doc, owner, variables, view } = table;
	const scope = view.scope(owner);
	const free = variables.filter(
		(variable) => variable.id !== choice.id && drivingIn(scope, variable.id) === null,
	);

	return (
		<select
			aria-label={`Add a variable to the ${choice.name} table`}
			className="property-input table-add"
			onChange={(event) => {
				const variable = free.find((held) => held.id === event.target.value);
				if (variable !== undefined) {
					setCell(
						doc,
						owner,
						{ choice: choice.id, option, variable: variable.id },
						variable.initial,
					);
					commitVariables(doc);
				}
			}}
			value=""
		>
			<option value="">Add a variable to this table</option>
			{free.map((variable) => (
				<option key={variable.id} value={variable.id}>
					{variable.name}
				</option>
			))}
		</select>
	);
}

export function ChoiceTable(table: TableProps): ReactElement {
	const { choice, owner, variables, view } = table;
	const [picked, setPicked] = useState<string | null>(null);
	const option =
		picked !== null && choice.options.includes(picked) ? picked : (choice.options[0] ?? "");
	const driven = drivenIn(view.scope(owner), choice.id);

	return (
		<div className="choice-table">
			<label className="property-field">
				<span className="property-label">Values for</span>
				<select
					className="property-input prop-choice"
					onChange={(event) => {
						setPicked(event.target.value);
					}}
					value={option}
				>
					{choice.options.map((each) => (
						<option key={each} value={each}>
							{each}
						</option>
					))}
				</select>
			</label>
			{variables
				.filter((variable) => driven.has(variable.id))
				.map((variable) => (
					<DrivenRow key={variable.id} option={option} variable={variable} {...table} />
				))}
			<AddToTable option={option} {...table} />
		</div>
	);
}

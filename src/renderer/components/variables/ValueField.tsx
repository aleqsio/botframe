import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import { emptyValue, isReference } from "../../../document/variable";
import type { Literal, VariableType, VariableValue } from "../../../document/variable";
import { ColorField } from "../ColorField";
import { DraftInput } from "../PropertyField";
import { VariablePicker, choicesAt, valueText } from "./VariablePicker";

export interface ValueFieldProps {
	view: ComponentsView;
	label: string;
	type: VariableType;
	options: readonly string[];
	value: VariableValue;
	owners: readonly string[];
	dimmed?: boolean;
	onPick: (value: VariableValue) => void;
	onDone: () => void;
}

function numberOf(text: string): number | null {
	const value = Number(text);
	return text.trim() !== "" && Number.isFinite(value) ? value : null;
}

function LiteralControl(props: ValueFieldProps & { value: Literal }): ReactElement {
	const { label, onDone, options, type, value } = props;
	const onPick = (next: VariableValue): void => {
		props.onPick(next);
		onDone();
	};
	if (type === "color") {
		return (
			<ColorField label={label} onChange={props.onPick} onCommit={onDone} value={String(value)} />
		);
	}
	if (type === "boolean") {
		return (
			<input
				aria-label={label}
				checked={value === true}
				onChange={(event) => {
					onPick(event.target.checked);
				}}
				type="checkbox"
			/>
		);
	}
	if (type === "choice") {
		return (
			<select
				aria-label={label}
				className="property-input prop-choice"
				onChange={(event) => {
					onPick(event.target.value);
				}}
				value={String(value)}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	}
	const numeric = type === "length" || type === "number";
	return (
		<DraftInput
			inputMode={numeric ? "numeric" : "text"}
			label={label}
			onCommit={(text) => {
				const next = numeric ? numberOf(text) : text;
				if (next !== null) {
					onPick(next);
				}
			}}
			value={String(value)}
		/>
	);
}

export function ValueField(props: ValueFieldProps): ReactElement {
	const { label, onDone, onPick, options, owners, type, value, view } = props;
	const reference = isReference(value);

	return (
		<div className="variable-field" data-dimmed={props.dimmed === true ? "" : undefined}>
			{reference ? (
				<span className="variable-reference">{valueText(view, value)}</span>
			) : (
				<LiteralControl {...props} value={value} />
			)}
			<VariablePicker
				bound={reference}
				choices={choicesAt(view, owners, type)}
				view={view}
				label={label}
				onPick={(variable) => {
					onPick(variable === null ? emptyValue(type, options) : { var: variable });
					onDone();
				}}
			/>
		</div>
	);
}

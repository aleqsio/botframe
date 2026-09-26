import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { VariableValue } from "../../../document/value";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { editVariable, optionsOf, removeVariable } from "./scopeEdit";
import type { TargetAction } from "./target";

export function RemoveButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}): ReactElement {
	return (
		<button aria-label={label} className="guide-button" onClick={onPress} type="button">
			<Icon name="minus" />
		</button>
	);
}

function OptionChips({
	locked,
	onChange,
	options,
}: {
	locked: boolean;
	options: readonly string[];
	onChange: (options: readonly string[]) => void;
}): ReactElement {
	return (
		<div className="option-chips">
			{options.map((option) => (
				<span className="option-chip" key={option}>
					{option}
					{locked || options.length === 1 ? null : (
						<button
							aria-label={`Remove the option ${option}`}
							className="option-remove"
							onClick={() => {
								onChange(options.filter((held) => held !== option));
							}}
							type="button"
						>
							×
						</button>
					)}
				</span>
			))}
			{locked ? null : (
				<span className="option-add">
					<DraftInput
						inputMode="text"
						label="Add an option"
						placeholder="+ option"
						onCommit={(text) => {
							onChange([...new Set([...options, ...optionsOf(text)])]);
						}}
						value=""
					/>
				</span>
			)}
		</div>
	);
}

export interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	locked: boolean;
}

function NameEditor({
	doc,
	owner,
	variable,
	onDone,
}: RowProps & { onDone: () => void }): ReactElement {
	return (
		<span
			className="prop-name-editor"
			onBlur={onDone}
			ref={(held) => {
				held?.querySelector("input")?.focus();
			}}
		>
			<DraftInput
				inputMode="text"
				label={`${variable.name} name`}
				onCommit={(name) => {
					if (name.trim() !== "") {
						editVariable(doc, owner, variable, { name: name.trim() });
					}
				}}
				value={variable.name}
			/>
		</span>
	);
}

export function NameCell(props: RowProps & { dimmed: boolean }): ReactElement {
	const { dimmed, locked, variable } = props;
	const [editing, setEditing] = useState(false);
	if (editing) {
		return (
			<NameEditor
				{...props}
				onDone={() => {
					setEditing(false);
				}}
			/>
		);
	}
	return (
		<span className="prop-name" data-dimmed={dimmed ? "" : undefined}>
			<span className="prop-name-text">{variable.name}</span>
			{locked ? null : (
				<button
					aria-label={`Rename ${variable.name}`}
					className="rename-button"
					onClick={() => {
						setEditing(true);
					}}
					title="Rename"
					type="button"
				>
					<Icon name="pencil" />
				</button>
			)}
		</span>
	);
}

export function RowEnd({ doc, locked, owner, variable }: RowProps): ReactElement {
	return locked ? (
		<span />
	) : (
		<RemoveButton
			label={`Delete ${variable.name}`}
			onPress={() => {
				removeVariable(doc, owner, variable.id);
			}}
		/>
	);
}

export function Options({ doc, locked, owner, variable }: RowProps): ReactElement | null {
	if (variable.type !== "choice" || locked) {
		return null;
	}
	return (
		<div className="prop-options">
			<OptionChips
				locked={false}
				onChange={(options) => {
					editVariable(doc, owner, variable, { options });
				}}
				options={variable.options}
			/>
		</div>
	);
}

export function heldActions(
	props: RowProps,
	held: VariableValue,
	write: (value: VariableValue | null) => void,
): readonly TargetAction[] {
	return [
		{
			label: "Use the default",
			run: () => {
				write(null);
			},
		},
		{
			label: "Make this the default for all copies",
			run: () => {
				editVariable(props.doc, props.owner, props.variable, { initial: held });
			},
		},
	];
}

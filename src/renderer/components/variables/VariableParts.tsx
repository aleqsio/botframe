import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { VariableValue } from "../../../document/value";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { editVariable, removeVariable } from "./scopeEdit";
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

export interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	locked: boolean;
	fresh: boolean;
	onSettled: () => void;
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
				held?.querySelector("input")?.select();
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
	const { dimmed, fresh, locked, onSettled, variable } = props;
	const [editing, setEditing] = useState(false);
	if (editing || fresh) {
		return (
			<NameEditor
				{...props}
				onDone={() => {
					setEditing(false);
					onSettled();
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

export function optionsWriter({
	doc,
	locked,
	owner,
	variable,
}: RowProps): ((options: readonly string[]) => void) | undefined {
	if (variable.type !== "choice" || locked) {
		return undefined;
	}
	return (options) => {
		editVariable(doc, owner, variable, { options });
	};
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

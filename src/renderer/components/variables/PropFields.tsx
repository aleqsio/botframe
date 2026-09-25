import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Variable } from "../../../document/variable";
import { DraftInput } from "../PropertyField";
import { defaultTarget } from "./defaultTarget";
import { editVariable, typeName } from "./scopeEdit";
import { ValueControl } from "./ValueControl";
import { OptionChips } from "./VariableParts";

export interface SettingsProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	locked: boolean;
	withDefault: boolean;
	onReset: (() => void) | null;
}

export function PropFields({
	doc,
	locked,
	owner,
	variable,
	view,
	withDefault,
}: SettingsProps): ReactElement {
	return (
		<>
			<div className="settings-field">
				<span className="property-label">Name</span>
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
			</div>
			<div className="settings-field">
				<span className="property-label">Type</span>
				<span className="variable-name">{typeName(variable.type)}</span>
			</div>
			{variable.type === "choice" ? (
				<div className="settings-field">
					<span className="property-label">Options</span>
					<OptionChips
						locked={locked}
						onChange={(options) => {
							editVariable(doc, owner, variable, { options });
						}}
						options={variable.options}
					/>
				</div>
			) : null}
			{withDefault ? (
				<div className="settings-field">
					<span className="property-label">Default</span>
					<ValueControl target={defaultTarget(doc, view, owner, variable)} />
				</div>
			) : null}
		</>
	);
}

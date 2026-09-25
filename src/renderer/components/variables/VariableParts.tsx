import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE, VARIABLE_TYPES } from "../../../document/variable";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { addVariable, optionsOf, typeName } from "./scopeEdit";

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

export function NewVariable({ doc, owner }: { doc: DesignDocument; owner: string }): ReactElement {
	return (
		<div className="new-variable">
			<span className="property-label">
				{owner === DOCUMENT_SCOPE ? "New variable" : "New prop"}
			</span>
			<div className="new-variable-types">
				{VARIABLE_TYPES.map((type) => (
					<button
						className="pill-button"
						key={type}
						onClick={() => {
							addVariable(doc, owner, type);
						}}
						type="button"
					>
						{typeName(type)}
					</button>
				))}
			</div>
		</div>
	);
}

export function OptionChips({
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

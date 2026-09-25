import type { ReactElement } from "react";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { optionsOf } from "./scopeEdit";

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

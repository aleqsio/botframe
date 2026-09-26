import { Popover } from "@base-ui-components/react/popover";
import { useState } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon } from "../Icon";
import { DraftInput } from "../PropertyField";
import { optionsOf } from "./scopeEdit";

const POPUP_GAP = 4;

export interface ChoiceDropdownProps {
	label: string;
	options: readonly string[];
	value: string;
	onChange: (value: string) => void;
	onOptions: (options: readonly string[]) => void;
	anchor: RefObject<Element | null>;
}

function OptionRow({
	onPick,
	option,
	props,
}: {
	option: string;
	props: ChoiceDropdownProps;
	onPick: () => void;
}): ReactElement {
	const { onOptions, options, value } = props;
	return (
		<div className="choice-option">
			<button
				aria-pressed={option === value}
				className="choice-pick"
				onClick={onPick}
				type="button"
			>
				<span className="choice-check">{option === value ? <Icon name="check" /> : null}</span>
				<span className="choice-value">{option}</span>
			</button>
			{options.length === 1 ? null : (
				<button
					aria-label={`Remove the option ${option}`}
					className="choice-remove"
					onClick={() => {
						onOptions(options.filter((held) => held !== option));
					}}
					type="button"
				>
					<Icon name="close" />
				</button>
			)}
		</div>
	);
}

export function ChoiceDropdown(props: ChoiceDropdownProps): ReactElement {
	const { anchor, label, onChange, onOptions, options, value } = props;
	const [open, setOpen] = useState(false);

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger aria-label={label} className="property-input choice-trigger">
				<span className="choice-value">{value}</span>
				<Icon name="chevron" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" anchor={anchor} side="bottom" sideOffset={POPUP_GAP}>
					<Popover.Popup className="color-popup choice-popup">
						{options.map((option) => (
							<OptionRow
								key={option}
								onPick={() => {
									onChange(option);
									setOpen(false);
								}}
								option={option}
								props={props}
							/>
						))}
						<div className="choice-add">
							<DraftInput
								inputMode="text"
								label="Add an option"
								onCommit={(text) => {
									onOptions([...new Set([...options, ...optionsOf(text)])]);
								}}
								placeholder="+ Add option"
								value=""
							/>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

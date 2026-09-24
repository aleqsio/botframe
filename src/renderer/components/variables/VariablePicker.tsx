import { Popover } from "@base-ui-components/react/popover";
import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import { DOCUMENT_SCOPE, isReference } from "../../../document/variable";
import type { Variable, VariableType, VariableValue } from "../../../document/variable";
import { Icon } from "../Icon";

const POPUP_GAP = 8;
const DOCUMENT_LABEL = "Document";

export interface Choice {
	variable: Variable;
	owner: string;
}

export function ownerLabel(view: ComponentsView, owner: string): string {
	return owner === DOCUMENT_SCOPE ? DOCUMENT_LABEL : (view.entry(owner)?.name ?? owner);
}

export function valueText(view: ComponentsView, value: VariableValue): string {
	if (!isReference(value)) {
		return String(value);
	}
	return `→ ${view.declared(value.var)?.variable.name ?? "missing"}`;
}

export function choicesAt(
	view: ComponentsView,
	owners: readonly string[],
	type: VariableType | null,
): readonly Choice[] {
	return owners.flatMap((owner) =>
		view
			.scope(owner)
			.variables.filter((variable) => type === null || variable.type === type)
			.map((variable) => ({ variable, owner })),
	);
}

function matches(view: ComponentsView, choice: Choice, query: string): boolean {
	const text = `${choice.variable.name} ${ownerLabel(view, choice.owner)}`.toLowerCase();
	return text.includes(query.trim().toLowerCase());
}

function Swatch({ view, value }: { view: ComponentsView; value: VariableValue }): ReactElement {
	const text = valueText(view, value);
	const color = !isReference(value) && typeof value === "string" && CSS.supports("color", value);
	return (
		<span className="variable-value">
			{color ? <span className="variable-swatch" style={{ background: text }} /> : null}
			{text}
		</span>
	);
}

interface PickerProps {
	view: ComponentsView;
	choices: readonly Choice[];
	label: string;
	bound: boolean;
	onPick: (variable: string | null) => void;
}

function PickerList({ view, choices, onPick, bound }: Omit<PickerProps, "label">): ReactElement {
	const [query, setQuery] = useState("");
	const shown = choices.filter((choice) => matches(view, choice, query));

	return (
		<>
			<input
				aria-label="Search variables"
				className="property-input variable-search"
				onChange={(event) => {
					setQuery(event.target.value);
				}}
				placeholder="Search variables"
				value={query}
			/>
			<div className="variable-options">
				{shown.map(({ owner, variable }) => (
					<button
						className="variable-option"
						key={variable.id}
						onClick={() => {
							onPick(variable.id);
						}}
						type="button"
					>
						<span className="variable-name">{variable.name}</span>
						<span className="variable-owner">{ownerLabel(view, owner)}</span>
						<Swatch value={variable.initial} view={view} />
					</button>
				))}
				{shown.length === 0 ? <p className="component-note">No variable of this type.</p> : null}
			</div>
			{bound ? (
				<button
					className="pill-button variable-unbind"
					onClick={() => {
						onPick(null);
					}}
					type="button"
				>
					Remove the variable
				</button>
			) : null}
		</>
	);
}

export function VariablePicker({ label, ...list }: PickerProps): ReactElement {
	const [open, setOpen] = useState(false);

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger
				aria-label={`${label} variable`}
				aria-pressed={list.bound}
				className="bind-button"
				title="Use a variable"
			>
				<Icon name="component" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" side="left" sideOffset={POPUP_GAP}>
					<Popover.Popup className="color-popup variable-popup">
						<PickerList
							{...list}
							onPick={(variable) => {
								list.onPick(variable);
								setOpen(false);
							}}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

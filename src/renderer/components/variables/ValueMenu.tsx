import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import { isCondition, isLiteral } from "../../../document/value";
import type { VariableValue } from "../../../document/value";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import {
	groupsOf,
	isColor,
	literalText,
	nameOf,
	nearestOf,
	referenced,
	starterCondition,
} from "./reach";
import type { Group, Reach } from "./reach";
import type { EditTarget, MakeAction } from "./target";

function matching(groups: readonly Group[], query: string): readonly Group[] {
	const text = query.trim().toLowerCase();
	return groups.flatMap((group) => {
		const variables = group.variables.filter((variable) =>
			variable.name.toLowerCase().includes(text),
		);
		return variables.length === 0 ? [] : [{ ...group, variables }];
	});
}

function SourceMark({
	held,
	view,
}: {
	held: VariableValue | null;
	view: ComponentsView;
}): ReactElement | null {
	if (held === null || isLiteral(held)) {
		return null;
	}
	return isCondition(held) ? (
		<Icon name="branch" />
	) : (
		<span className="variable-chip">{nameOf(view, held.var)}</span>
	);
}

function NearestText({ reach, variable }: { reach: Reach; variable: Variable }): ReactElement {
	const { held, value } = nearestOf(reach, variable.id);
	return (
		<span className="value-option-default">
			<SourceMark held={held} view={reach.view} />
			{value !== null && isColor(value) ? (
				<span aria-hidden="true" className="value-swatch" style={{ background: value }} />
			) : null}
			{value === null ? "…" : literalText(value)}
		</span>
	);
}

function made(make: MakeAction, query: string): { label: string; name: string } {
	const typed = query.trim();
	return typed === ""
		? { label: make.label, name: make.name }
		: { label: `${make.label} “${typed}”`, name: typed };
}

function Actions({ query, target }: { query: string; target: EditTarget }): ReactElement {
	const { current, make, onChange, reach, value } = target;
	return (
		<div className="value-actions">
			<button
				className="value-action"
				onClick={() => {
					onChange(starterCondition(reach, current, target.addTest));
				}}
				type="button"
			>
				<Icon name="branch" />
				Add a condition
			</button>
			{make === null ? null : (
				<button
					className="value-action"
					onClick={() => {
						onChange({ var: make.run(made(make, query).name) });
					}}
					type="button"
				>
					<Icon name="plus" />
					{made(make, query).label}
				</button>
			)}
			{isLiteral(value) ? null : (
				<button
					className="value-action"
					onClick={() => {
						onChange(current);
					}}
					type="button"
				>
					Use a plain value
				</button>
			)}
			<ExtraActions target={target} />
		</div>
	);
}

export function ExtraActions({ target }: { target: EditTarget }): ReactElement {
	return (
		<>
			{(target.extra ?? []).map((action) => (
				<button className="value-action" key={action.label} onClick={action.run} type="button">
					{action.label}
				</button>
			))}
		</>
	);
}

function pickTyped(target: EditTarget, groups: readonly Group[], query: string): void {
	const [first] = groups.flatMap((group) => group.variables);
	const { make } = target;
	if (first !== undefined) {
		target.onChange({ var: first.id });
	} else if (make !== null) {
		target.onChange({ var: make.run(made(make, query).name) });
	}
}

export function ValueMenu({
	onPicked,
	target,
}: {
	target: EditTarget;
	onPicked: () => void;
}): ReactElement {
	const [query, setQuery] = useState("");
	const groups = matching(groupsOf(target.reach, target.type), query);
	const picked = referenced(target.value);

	return (
		<div className="value-menu">
			<input
				aria-label="Search variables"
				className="property-input value-search"
				onChange={(event) => {
					setQuery(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						pickTyped(target, groups, query);
						onPicked();
					}
				}}
				placeholder={`Search ${target.type} variables`}
				value={query}
			/>
			<div className="value-options">
				{groups.map((group) => (
					<div className="value-group" key={group.owner}>
						<span className="value-group-name">{group.label}</span>
						{group.variables.map((variable) => (
							<button
								aria-pressed={picked === variable.id}
								className="value-option"
								key={variable.id}
								onClick={() => {
									target.onChange({ var: variable.id });
									onPicked();
								}}
								type="button"
							>
								<span className="value-option-name">{variable.name}</span>
								<NearestText reach={target.reach} variable={variable} />
							</button>
						))}
					</div>
				))}
				{groups.length === 0 ? <p className="panel-note">No variable here.</p> : null}
			</div>
			<Actions query={query} target={target} />
		</div>
	);
}

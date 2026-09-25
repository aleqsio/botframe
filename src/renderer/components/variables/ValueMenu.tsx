import { useState } from "react";
import type { ReactElement } from "react";
import { isLiteral } from "../../../document/value";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { groupsOf, isColor, literalText, referenced, starterCondition } from "./reach";
import type { Group } from "./reach";
import type { EditTarget } from "./target";

function matching(groups: readonly Group[], query: string): readonly Group[] {
	const text = query.trim().toLowerCase();
	return groups.flatMap((group) => {
		const variables = group.variables.filter((variable) =>
			variable.name.toLowerCase().includes(text),
		);
		return variables.length === 0 ? [] : [{ ...group, variables }];
	});
}

function DefaultText({ variable }: { variable: Variable }): ReactElement {
	const { initial } = variable;
	if (!isLiteral(initial)) {
		return <span className="value-option-default">…</span>;
	}
	return (
		<span className="value-option-default">
			{isColor(initial) ? (
				<span aria-hidden="true" className="value-swatch" style={{ background: initial }} />
			) : null}
			{literalText(initial)}
		</span>
	);
}

function Actions({ target }: { target: EditTarget }): ReactElement {
	const { current, make, onChange, reach, value } = target;
	return (
		<div className="value-actions">
			<button
				className="value-action"
				onClick={() => {
					onChange(starterCondition(reach, current));
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
						onChange({ var: make.run() });
					}}
					type="button"
				>
					<Icon name="plus" />
					{make.label}
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
		</div>
	);
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
								<DefaultText variable={variable} />
							</button>
						))}
					</div>
				))}
				{groups.length === 0 ? <p className="component-note">No variable here.</p> : null}
			</div>
			<Actions target={target} />
		</div>
	);
}

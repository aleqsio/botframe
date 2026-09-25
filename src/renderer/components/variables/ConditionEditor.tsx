import type { ReactElement } from "react";
import { isLiteral } from "../../../document/value";
import type { Case, Condition, Result } from "../../../document/value";
import type { Variable } from "../../../document/variable";
import { Icon } from "../Icon";
import { LiteralInput, SelectBox } from "./LiteralInput";
import { firstValue, groupsOf, nameOf, newCase, slotsOf } from "./reach";
import { RemoveButton } from "./VariableParts";
import type { Reach } from "./reach";
import type { EditTarget } from "./target";

const A_VALUE = "";

function testOf(reach: Reach, id: string): Variable | null {
	return reach.view.declared(id)?.variable ?? null;
}

function VariableSelect({
	reach,
	type,
	...box
}: {
	label: string;
	reach: Reach;
	type: Variable["type"] | null;
	value: string;
	onChange: (id: string) => void;
}): ReactElement {
	return (
		<SelectBox {...box}>
			{type === null ? null : <option value={A_VALUE}>A value</option>}
			{groupsOf(reach, type).map((group) => (
				<optgroup key={group.owner} label={group.label}>
					{group.variables.map((variable) => (
						<option key={variable.id} value={variable.id}>
							{variable.name}
						</option>
					))}
				</optgroup>
			))}
		</SelectBox>
	);
}

function ResultControl({
	label,
	onChange,
	result,
	target,
}: {
	label: string;
	result: Result;
	target: EditTarget;
	onChange: (result: Result) => void;
}): ReactElement {
	const { current, options, reach, type } = target;
	return (
		<span className="case-result">
			{isLiteral(result) ? (
				<LiteralInput
					label={label}
					onChange={onChange}
					options={options}
					type={type}
					value={result}
				/>
			) : (
				<span className="variable-chip">{nameOf(reach.view, result.var)}</span>
			)}
			<span className="case-pick">
				<Icon name="hexagon" />
				<VariableSelect
					label={`${label} variable`}
					onChange={(id) => {
						onChange(id === A_VALUE ? current : { var: id });
					}}
					reach={reach}
					type={type}
					value={isLiteral(result) ? A_VALUE : result.var}
				/>
			</span>
		</span>
	);
}

function CaseRow({
	condition,
	index,
	target,
}: {
	condition: Condition;
	index: number;
	target: EditTarget;
}): ReactElement | null {
	const held = condition.when[index];
	if (held === undefined) {
		return null;
	}
	const test = testOf(target.reach, held.test);
	const write = (next: Case | null): void => {
		const when = condition.when.flatMap((each, at) => (at === index ? (next ?? []) : [each]));
		target.onChange({ ...condition, when });
	};
	const label = `Case ${index + 1}`;

	return (
		<div className="case-row">
			<span className="case-word">when</span>
			<VariableSelect
				label={`${label} test`}
				onChange={(id) => {
					write({ ...held, test: id, is: firstValue(testOf(target.reach, id)) });
				}}
				reach={target.reach}
				type={null}
				value={held.test}
			/>
			<span className="case-word">is</span>
			<LiteralInput
				label={`${label} value`}
				onChange={(is) => {
					write({ ...held, is });
				}}
				options={test?.options ?? []}
				type={test?.type ?? "text"}
				value={held.is}
			/>
			<span className="case-word">→</span>
			<ResultControl
				label={`${label} result`}
				onChange={(result) => {
					write({ ...held, result });
				}}
				result={held.result}
				target={target}
			/>
			<RemoveButton
				label={`Remove ${label.toLowerCase()}`}
				onPress={() => {
					write(null);
				}}
			/>
		</div>
	);
}

function added(target: EditTarget, condition: Condition): Condition {
	const fresh = newCase(target.reach, target.current);
	return fresh === null ? condition : { ...condition, when: [...condition.when, fresh] };
}

export function ConditionEditor({
	condition,
	target,
}: {
	condition: Condition;
	target: EditTarget;
}): ReactElement {
	const slots = slotsOf(condition.when.length);
	return (
		<div className="condition-editor">
			<span className="condition-title">{target.label} · condition</span>
			{slots.map((slot, index) => (
				<CaseRow condition={condition} index={index} key={slot} target={target} />
			))}
			<div className="case-row">
				<span className="case-word">else</span>
				<span className="case-else-gap" />
				<span className="case-word">→</span>
				<ResultControl
					label="Else result"
					onChange={(result) => {
						target.onChange({ ...condition, else: result });
					}}
					result={condition.else}
					target={target}
				/>
			</div>
			<div className="value-actions value-actions-row">
				<button
					className="value-action"
					onClick={() => {
						target.onChange(added(target, condition));
					}}
					type="button"
				>
					<Icon name="plus" />
					Add a case
				</button>
				<button
					className="value-action"
					onClick={() => {
						target.onChange(target.current);
					}}
					type="button"
				>
					Use a plain value
				</button>
			</div>
		</div>
	);
}

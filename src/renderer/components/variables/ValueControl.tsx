import type { ReactElement } from "react";
import { isLiteral } from "../../../document/value";
import { BindButton } from "./BindButton";
import { BoundSummary } from "./BoundSummary";
import { LiteralInput } from "./LiteralInput";
import type { EditTarget } from "./target";

export function ValueControl({
	dimmed = false,
	target,
}: {
	dimmed?: boolean;
	target: EditTarget;
}): ReactElement {
	const { current, label, onChange, options, reach, type, value } = target;
	return (
		<div className="value-control" data-dimmed={dimmed ? "" : undefined}>
			{isLiteral(value) ? (
				<LiteralInput
					label={label}
					onChange={onChange}
					onOptions={target.onOptions}
					options={options}
					type={type}
					value={value}
				/>
			) : (
				<BoundSummary bound={value} now={current} view={reach.view} />
			)}
			<BindButton target={target} />
		</div>
	);
}

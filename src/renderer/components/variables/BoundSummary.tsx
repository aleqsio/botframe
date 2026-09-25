import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import { isLiteral } from "../../../document/value";
import type { Bound, Literal, Result } from "../../../document/value";
import { isColor, literalText, nameOf } from "./reach";

function Swatch({ value }: { value: Literal }): ReactElement | null {
	return isColor(value) ? (
		<span aria-hidden="true" className="value-swatch" style={{ background: value }} />
	) : null;
}

function Chip({ view, id }: { view: ComponentsView; id: string }): ReactElement {
	return <span className="variable-chip">{nameOf(view, id)}</span>;
}

function ResultText({ result, view }: { result: Result; view: ComponentsView }): ReactElement {
	return isLiteral(result) ? (
		<>
			<Swatch value={result} />
			{literalText(result)}
		</>
	) : (
		<Chip id={result.var} view={view} />
	);
}

export function BoundSummary({
	bound,
	now,
	view,
}: {
	bound: Bound;
	now: Literal;
	view: ComponentsView;
}): ReactElement {
	if ("var" in bound) {
		return (
			<span className="bound-summary">
				<Chip id={bound.var} view={view} />
				<span className="bound-now">
					<Swatch value={now} />
					{literalText(now)}
				</span>
			</span>
		);
	}
	return (
		<span className="bound-summary bound-condition" title="Condition">
			<Swatch value={now} />
			<span className="bound-line">
				{bound.when.map((held) => (
					<span key={JSON.stringify(held)}>
						<span className="bound-keyword">when</span> <Chip id={held.test} view={view} /> is{" "}
						{literalText(held.is)} → <ResultText result={held.result} view={view} />,{" "}
					</span>
				))}
				<span className="bound-keyword">else</span> <ResultText result={bound.else} view={view} />
			</span>
		</span>
	);
}

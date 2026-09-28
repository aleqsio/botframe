import type { ReactElement } from "react";
import type { Layer } from "../../../document/layer";
import { isLiteral } from "../../../document/value";
import type { Literal, VariableValue } from "../../../document/value";
import { emptyValue } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import type { Reach } from "./reach";
import { defaultTarget } from "./defaultTarget";
import { testMaker } from "./scopeEdit";
import { ValueControl } from "./ValueControl";
import { NameCell, RowEnd, heldActions, optionsWriter } from "./VariableParts";
import type { RowProps } from "./VariableParts";

const MESSAGE = "set prop";

function currentOf(layer: Layer, variable: Variable): Literal {
	const resolved =
		layer.content.kind === "component" ? layer.content.values[variable.id] : undefined;
	if (resolved !== undefined) {
		return resolved;
	}
	const { initial, options, type } = variable;
	return isLiteral(initial) ? initial : emptyValue(type, options);
}

export function CopyPropRow(props: RowProps & { layer: Layer; reach: Reach }): ReactElement {
	const { doc, layer, reach, variable } = props;
	const held = layer.content.kind === "component" ? layer.content.props[variable.id] : undefined;
	const current = currentOf(layer, variable);
	const write = (value: VariableValue | null): void => {
		doc.update(layer.id, { props: { [variable.id]: value } });
		doc.commit(MESSAGE);
	};

	return (
		<div className="prop-row">
			<NameCell {...props} dimmed={held === undefined} />
			<ValueControl
				changed={held !== undefined}
				dimmed={held === undefined}
				target={{
					reach,
					label: variable.name,
					type: variable.type,
					options: variable.options,
					value: held ?? current,
					current,
					make: null,
					addTest: testMaker(doc, reach.owners),
					onChange: write,
					extra: held === undefined ? [] : heldActions(props, held, write),
					onOptions: optionsWriter(props),
				}}
			/>
			<RowEnd {...props} />
		</div>
	);
}

export function DefaultRow(props: RowProps): ReactElement {
	const { doc, owner, variable, view } = props;
	return (
		<div className="prop-row">
			<NameCell {...props} dimmed={false} />
			<ValueControl target={defaultTarget(doc, view, owner, variable)} />
			<RowEnd {...props} />
		</div>
	);
}

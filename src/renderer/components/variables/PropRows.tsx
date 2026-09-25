import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { isLiteral } from "../../../document/value";
import type { Literal, VariableValue } from "../../../document/value";
import { emptyValue } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { defaultTarget } from "./defaultTarget";
import { PropSettings } from "./PropSettings";
import { ValueControl } from "./ValueControl";

const MESSAGE = "set prop";

interface RowProps {
	doc: DesignDocument;
	view: ComponentsView;
	owner: string;
	variable: Variable;
	locked: boolean;
}

function currentOf(layer: Layer, variable: Variable): Literal {
	const resolved =
		layer.content.kind === "component" ? layer.content.values[variable.id] : undefined;
	if (resolved !== undefined) {
		return resolved;
	}
	const { initial, options, type } = variable;
	return isLiteral(initial) ? initial : emptyValue(type, options);
}

export function CopyPropRow(
	props: RowProps & { layer: Layer; owners: readonly string[] },
): ReactElement {
	const { doc, layer, owners, variable, view } = props;
	const held = layer.content.kind === "component" ? layer.content.props[variable.id] : undefined;
	const current = currentOf(layer, variable);
	const write = (value: VariableValue | null): void => {
		doc.update(layer.id, { props: { [variable.id]: value } });
		doc.commit(MESSAGE);
	};

	return (
		<div className="prop-row">
			<span className="prop-name" data-dimmed={held === undefined ? "" : undefined}>
				{variable.name}
			</span>
			<ValueControl
				dimmed={held === undefined}
				target={{
					reach: { view, owners },
					label: variable.name,
					type: variable.type,
					options: variable.options,
					value: held ?? current,
					current,
					make: null,
					onChange: write,
				}}
			/>
			<PropSettings
				{...props}
				onReset={
					held === undefined
						? null
						: () => {
								write(null);
							}
				}
				withDefault
			/>
		</div>
	);
}

export function DefaultRow(props: RowProps): ReactElement {
	const { doc, owner, variable, view } = props;
	return (
		<div className="prop-row">
			<span className="prop-name">{variable.name}</span>
			<ValueControl target={defaultTarget(doc, view, owner, variable)} />
			<PropSettings {...props} onReset={null} withDefault={false} />
		</div>
	);
}

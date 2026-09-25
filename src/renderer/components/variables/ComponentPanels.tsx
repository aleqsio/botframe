import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE, VARIABLE_TYPES } from "../../../document/variable";
import { useComponentRows, useComponentsView } from "../../useDocument";
import { Icon } from "../Icon";
import { isFrame } from "../layerEntry";
import { FrameSection, copyActions } from "./ComponentActions";
import type { PanelProps } from "./ComponentActions";
import { IconMenu } from "./IconMenu";
import type { MenuAction } from "./IconMenu";
import { CopyPropRow, DefaultRow } from "./PropRows";
import { addVariable, typeName } from "./scopeEdit";

function addActions(doc: DesignDocument, owner: string): readonly MenuAction[] {
	return VARIABLE_TYPES.map((type) => ({
		label: typeName(type),
		run: () => {
			addVariable(doc, owner, type);
		},
	}));
}

function CopySection(props: PanelProps & { component: string }): ReactElement {
	const { component, doc, layer } = props;
	const view = useComponentsView(doc);
	const entry = view.entry(component);
	const copies = useComponentRows(doc).find((held) => held.id === component)?.copies ?? 0;
	const locked = entry?.body.kind !== "layers";
	const owners = doc.tree.ownersAt(layer.id, true);

	return (
		<section aria-label="Component" className="field-group layout-section">
			<header className="layout-head">
				<span className="group-label">Component</span>
				{locked ? null : (
					<IconMenu actions={addActions(doc, component)} icon="plus" label="Add a prop" />
				)}
				{locked ? null : (
					<IconMenu actions={copyActions(props)} icon="more" label="Component actions" />
				)}
			</header>
			<div className="component-title">
				<Icon name="component" />
				<span className="component-name">{entry?.name ?? "Missing component"}</span>
				<span className="component-count">{copies === 1 ? "1 copy" : `${copies} copies`}</span>
			</div>
			{view.variables(component).map((variable) => (
				<CopyPropRow
					doc={doc}
					key={variable.id}
					layer={layer}
					locked={locked}
					owner={component}
					owners={owners}
					variable={variable}
					view={view}
				/>
			))}
		</section>
	);
}

export function LayerPanels(props: PanelProps): ReactElement | null {
	const { layer } = props;
	const { content } = layer;
	if (content.kind === "component") {
		return <CopySection {...props} component={content.component} />;
	}
	return isFrame(layer) ? <FrameSection {...props} /> : null;
}

export function DocumentPanels({ doc }: { doc: DesignDocument }): ReactElement {
	const view = useComponentsView(doc);
	return (
		<section aria-label="Document variables" className="field-group layout-section">
			<header className="layout-head">
				<span className="group-label">Document variables</span>
				<IconMenu actions={addActions(doc, DOCUMENT_SCOPE)} icon="plus" label="Add a variable" />
			</header>
			{view.variables(DOCUMENT_SCOPE).map((variable) => (
				<DefaultRow
					doc={doc}
					key={variable.id}
					locked={false}
					owner={DOCUMENT_SCOPE}
					variable={variable}
					view={view}
				/>
			))}
		</section>
	);
}

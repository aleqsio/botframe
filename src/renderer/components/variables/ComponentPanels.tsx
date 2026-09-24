import type { ReactElement } from "react";
import { useComponentRows, useComponentsView } from "../../useDocument";
import { isFrame } from "../layerEntry";
import { BindingsSection } from "./BindingsSection";
import { PropsSection } from "./PropsSection";
import { CopyActions, FrameSection } from "./ComponentActions";
import type { PanelProps } from "./ComponentActions";
import { VariablesSection } from "./VariablesSection";

function CopySection(props: PanelProps & { component: string }): ReactElement {
	const { component, doc } = props;
	const row = useComponentRows(doc).find((held) => held.id === component);
	const entry = useComponentsView(doc).entry(component);
	const copies = row?.copies ?? 0;

	return (
		<>
			<div className="field-group layout-section">
				<span className="group-label">Component</span>
				<span className="component-heading">
					{entry?.name ?? "Missing component"} · {copies} {copies === 1 ? "copy" : "copies"}
				</span>
				{entry?.body.kind === "layers" ? <CopyActions {...props} /> : null}
			</div>
			<VariablesSection doc={doc} owner={component} title="Variables · all copies" />
			<PropsSection doc={doc} layer={props.layer} />
		</>
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

export function FieldPanels({ doc, layer, user }: PanelProps): ReactElement {
	return (
		<BindingsSection
			doc={doc}
			layer={layer}
			onSelect={(id) => {
				user.selection.set([id]);
			}}
		/>
	);
}

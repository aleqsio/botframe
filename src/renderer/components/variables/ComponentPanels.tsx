import { useState } from "react";
import type { ReactElement } from "react";
import { useComponentRows, useComponentsView } from "../../useDocument";
import { isFrame } from "../layerEntry";
import { FrameSection } from "./ComponentActions";
import type { PanelProps } from "./ComponentActions";
import { AddMenu, variableChoices } from "./AddMenu";
import { InstanceHeader } from "./InstanceHeader";
import { CopyPropRow } from "./PropRows";

function CopySection(props: PanelProps & { component: string }): ReactElement {
	const { component, doc, layer } = props;
	const view = useComponentsView(doc);
	const entry = view.entry(component);
	const copies = useComponentRows(doc).find((held) => held.id === component)?.copies ?? 0;
	const locked = entry?.body.kind !== "layers";
	const reach = {
		view,
		owners: doc.tree.ownersAt(layer.id, true),
		source: doc.tree.resolver(),
		chain: doc.tree.contextOf(layer.id, true),
	};
	const [fresh, setFresh] = useState<string | null>(null);

	return (
		<section aria-label="Instance" className="field-group layout-section">
			<InstanceHeader {...props} count={copies} locked={locked} name={entry?.name ?? null} />
			<div className="props-head">
				<span className="property-label">Props</span>
				{locked ? null : (
					<AddMenu
						choices={variableChoices(doc, component)}
						label="Add prop"
						note="A prop each instance can set"
						onAdded={setFresh}
					/>
				)}
			</div>
			{view.variables(component).map((variable) => (
				<CopyPropRow
					doc={doc}
					fresh={fresh === variable.id}
					key={variable.id}
					layer={layer}
					locked={locked}
					onSettled={() => {
						setFresh(null);
					}}
					owner={component}
					reach={reach}
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

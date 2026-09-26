import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { useComponentRows, useComponentsView } from "../../useDocument";
import { isFrame } from "../layerEntry";
import { FrameSection } from "./ComponentActions";
import type { PanelProps } from "./ComponentActions";
import { AddMenu } from "./AddMenu";
import { InstanceHeader } from "./InstanceHeader";
import { CopyPropRow, DefaultRow } from "./PropRows";

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
						doc={doc}
						label="Add prop"
						note="A prop each instance can set"
						onAdded={setFresh}
						owner={component}
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

export function DocumentPanels({ doc }: { doc: DesignDocument }): ReactElement {
	const view = useComponentsView(doc);
	const [fresh, setFresh] = useState<string | null>(null);
	return (
		<section aria-label="Document variables" className="field-group layout-section">
			<header className="layout-head">
				<span className="group-label">Document variables</span>
				<AddMenu
					doc={doc}
					label="Add variable"
					note="A token each layer can use"
					onAdded={setFresh}
					owner={DOCUMENT_SCOPE}
				/>
			</header>
			{view.variables(DOCUMENT_SCOPE).map((variable) => (
				<DefaultRow
					doc={doc}
					fresh={fresh === variable.id}
					key={variable.id}
					locked={false}
					onSettled={() => {
						setFresh(null);
					}}
					owner={DOCUMENT_SCOPE}
					variable={variable}
					view={view}
				/>
			))}
		</section>
	);
}

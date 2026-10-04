import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { useComponentsView } from "../../useDocument";
import { MediaCards } from "../fill/MediaCards";
import { PaintGroup } from "../fill/PaintGroup";
import { AddMenu, VALUE_TYPES, variableChoices } from "./AddMenu";
import { DefaultRow } from "./PropRows";

function VariableGroup({
	fresh,
	onAdded,
	onSettled,
	...props
}: {
	doc: DesignDocument;
	view: ComponentsView;
	fresh: string | null;
	onAdded: (id: string) => void;
	onSettled: () => void;
}): ReactElement {
	const variables = props.view
		.variables(DOCUMENT_SCOPE)
		.filter((variable) => variable.type !== "color");
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">Variables</span>
				<AddMenu
					choices={variableChoices(props.doc, DOCUMENT_SCOPE, onAdded, VALUE_TYPES)}
					compact
					label="Add variable"
				/>
			</div>
			{variables.length === 0 ? <p className="fill-group-note">No variables.</p> : null}
			{variables.map((variable) => (
				<DefaultRow
					{...props}
					fresh={fresh === variable.id}
					key={variable.id}
					locked={false}
					onSettled={onSettled}
					owner={DOCUMENT_SCOPE}
					variable={variable}
				/>
			))}
		</div>
	);
}

export function DocumentSection({ doc }: { doc: DesignDocument }): ReactElement {
	const view = useComponentsView(doc);
	const [fresh, setFresh] = useState<string | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const settle = (): void => {
		setFresh(null);
	};
	const onAdded = (id: string): void => {
		setFresh(id);
		if (
			doc.components
				.scope(DOCUMENT_SCOPE)
				.variables()
				.some((held) => held.id === id && held.type === "color")
		) {
			setEditing(id);
		}
	};
	return (
		<section aria-label="Document" className="field-group layout-section">
			<header className="layout-head">
				<span className="group-label">Document</span>
			</header>
			<PaintGroup
				doc={doc}
				editing={editing}
				fresh={fresh}
				onAdded={onAdded}
				onEdit={setEditing}
				onSettled={settle}
				view={view}
			/>
			<VariableGroup doc={doc} fresh={fresh} onAdded={onAdded} onSettled={settle} view={view} />
			<MediaCards doc={doc} />
		</section>
	);
}

import { useState } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { useComponentsView } from "../../useDocument";
import { MediaCards } from "../fill/MediaCards";
import { PaintGroup } from "../fill/PaintGroup";
import { AddMenu, variableChoices } from "./AddMenu";
import { DefaultRow } from "./PropRows";

function VariableRows({
	fresh,
	onSettled,
	...props
}: {
	doc: DesignDocument;
	view: ComponentsView;
	fresh: string | null;
	onSettled: () => void;
}): ReactElement {
	return (
		<>
			{props.view
				.variables(DOCUMENT_SCOPE)
				.filter((variable) => variable.type !== "color")
				.map((variable) => (
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
		</>
	);
}

export function DocumentSection({
	doc,
	selection,
}: {
	doc: DesignDocument;
	selection: readonly LayerId[];
}): ReactElement {
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
				<AddMenu
					choices={variableChoices(doc, DOCUMENT_SCOPE)}
					label="Add variable"
					onAdded={onAdded}
				/>
			</header>
			<PaintGroup
				doc={doc}
				editing={editing}
				fresh={fresh}
				onAdded={onAdded}
				onEdit={setEditing}
				onSettled={settle}
				selection={selection}
				view={view}
			/>
			<VariableRows doc={doc} fresh={fresh} onSettled={settle} view={view} />
			<MediaCards doc={doc} selection={selection} />
		</section>
	);
}

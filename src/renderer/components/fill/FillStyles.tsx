import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import { useComponentsView } from "../../useDocument";
import { documentSwatches } from "./DocumentPaints";
import { IconButton } from "./IconButton";
import { addPaintVariable } from "./libraryActions";
import { MediaCards } from "./MediaCards";
import { PaintCard } from "./PaintCard";
import type { CardProps } from "./PaintCard";

const GROUPS: readonly { kind: "solid" | "gradient"; title: string; noun: string }[] = [
	{ kind: "solid", title: "Colors", noun: "color" },
	{ kind: "gradient", title: "Gradients", noun: "gradient" },
];

function PaintGroup({
	group,
	...props
}: CardProps & { group: (typeof GROUPS)[number]; onAdded: (id: string) => void }): ReactElement {
	const swatches = documentSwatches(
		{ view: props.view, source: props.doc.tree.resolver() },
		group.kind,
	);
	return (
		<div className="fill-group">
			<div className="fill-group-head">
				<span className="layout-sub">{group.title}</span>
				<IconButton
					icon="plus"
					label={`Add ${group.noun}`}
					onClick={() => {
						props.onAdded(addPaintVariable(props.doc, group.kind));
					}}
				/>
			</div>
			{swatches.length === 0 ? (
				<p className="component-note">{`No ${group.noun}s. Click + to add one.`}</p>
			) : (
				<ul className="fill-cards">
					{swatches.map((swatch) => (
						<PaintCard {...props} key={swatch.key} swatch={swatch} />
					))}
				</ul>
			)}
		</div>
	);
}

export function FillStyles({
	doc,
	selection,
}: {
	doc: DesignDocument;
	selection: readonly LayerId[];
}): ReactElement {
	const view = useComponentsView(doc);
	const [editing, setEditing] = useState<string | null>(null);
	const [fresh, setFresh] = useState<string | null>(null);
	const props = {
		doc,
		view,
		selection,
		editing,
		fresh,
		onEdit: setEditing,
		onSettled: () => {
			setFresh(null);
		},
		onAdded: (id: string) => {
			setFresh(id);
			setEditing(id);
		},
	};
	return (
		<section aria-label="Fill styles" className="field-group layout-section fill-styles">
			<header className="layout-head">
				<span className="group-label">Fill styles</span>
			</header>
			{GROUPS.map((group) => (
				<PaintGroup {...props} group={group} key={group.kind} />
			))}
			<MediaCards doc={doc} selection={selection} />
		</section>
	);
}

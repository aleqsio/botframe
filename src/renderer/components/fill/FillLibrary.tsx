import { useState } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import { useSlot } from "../../state/useSlot";
import type { UserState } from "../../state/userState";
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
	const swatches = documentSwatches(props.view, group.kind);
	return (
		<section className="fill-group">
			<div className="fill-group-head">
				<span className="group-label">{group.title}</span>
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
		</section>
	);
}

export function FillLibrary({ doc, user }: { doc: DesignDocument; user: UserState }): ReactElement {
	const view = useComponentsView(doc);
	const selection = useSlot(user.selection);
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
		<aside aria-label="Fills" id="fills">
			{GROUPS.map((group) => (
				<PaintGroup {...props} group={group} key={group.kind} />
			))}
			<MediaCards doc={doc} selection={selection} />
		</aside>
	);
}

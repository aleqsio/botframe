import { useRef } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import type { LayerId } from "../../../document/layer";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { bindFill } from "./libraryActions";
import type { Swatch } from "./SwatchGrid";
import { VariableEditor } from "./VariableEditor";

export interface CardProps {
	doc: DesignDocument;
	view: ComponentsView;
	selection: readonly LayerId[];
	editing: string | null;
	fresh: string | null;
	onEdit: (id: string | null) => void;
	onSettled: () => void;
}

export function PaintCard({
	doc,
	editing,
	fresh,
	onEdit,
	onSettled,
	selection,
	swatch,
	view,
}: CardProps & { swatch: Swatch }): ReactElement {
	const anchor = useRef<HTMLButtonElement>(null);
	const variable = view.variables(DOCUMENT_SCOPE).find((held) => held.id === swatch.key);
	return (
		<li className="fill-card">
			<button
				aria-label={swatch.label}
				className="fill-card-button"
				onClick={() => {
					if (selection.length === 0) {
						onEdit(swatch.key);
					} else {
						bindFill(doc, selection, swatch.key);
					}
				}}
				onContextMenu={(event) => {
					event.preventDefault();
					onEdit(swatch.key);
				}}
				onDoubleClick={() => {
					onEdit(swatch.key);
				}}
				ref={anchor}
				title={swatch.label}
				type="button"
			>
				<span className="fill-card-preview" style={{ background: swatch.paint }} />
				<span className="fill-card-name">{swatch.label}</span>
			</button>
			{editing === swatch.key && variable !== undefined ? (
				<VariableEditor
					anchor={anchor}
					doc={doc}
					fresh={fresh === swatch.key}
					onClose={() => {
						onEdit(null);
					}}
					onSettled={onSettled}
					paint={swatch.paint}
					variable={variable}
					view={view}
				/>
			) : null}
		</li>
	);
}

import { useRef } from "react";
import type { ReactElement } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import { editablePaint } from "./libraryActions";
import type { Swatch } from "./SwatchGrid";
import { VariableEditor } from "./VariableEditor";

export interface CardProps {
	doc: DesignDocument;
	view: ComponentsView;
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
	swatch,
	view,
}: CardProps & { swatch: Swatch }): ReactElement {
	const anchor = useRef<HTMLButtonElement>(null);
	const variable = view.variables(DOCUMENT_SCOPE).find((held) => held.id === swatch.key);
	const paint = variable === undefined ? null : editablePaint(variable);
	const edit = (): void => {
		if (paint !== null) {
			onEdit(swatch.key);
		}
	};
	return (
		<li className="fill-card">
			<button
				aria-label={swatch.label}
				className="fill-card-button"
				onClick={edit}
				onContextMenu={(event) => {
					event.preventDefault();
					edit();
				}}
				ref={anchor}
				title={paint === null ? `${swatch.label} uses a variable or a condition` : swatch.label}
				type="button"
			>
				<span className="fill-card-preview" style={{ background: swatch.paint }} />
				<span className="fill-card-name">{swatch.label}</span>
			</button>
			{editing === swatch.key && variable !== undefined && paint !== null ? (
				<VariableEditor
					anchor={anchor}
					doc={doc}
					fresh={fresh === swatch.key}
					onClose={() => {
						onEdit(null);
					}}
					onSettled={onSettled}
					paint={paint}
					variable={variable}
					view={view}
				/>
			) : null}
		</li>
	);
}

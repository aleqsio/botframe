import { Popover } from "@base-ui-components/react/popover";
import { useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import type { ComponentsView } from "../../../document/components";
import type { DesignDocument } from "../../../document/document";
import { paintOf } from "../../../document/paint";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { editVariable } from "../variables/scopeEdit";
import { NameCell, RowEnd } from "../variables/VariableParts";
import type { PaintEdit } from "./paintEdit";
import { PaintPicker } from "./PaintPicker";

const POPUP_GAP = 10;

interface Edge {
	getBoundingClientRect: () => DOMRect;
}

function panelEdge(card: HTMLElement | null): Edge | null {
	const panel = card?.closest("aside");
	if (card === null || panel === null || panel === undefined) {
		return null;
	}
	return {
		getBoundingClientRect: () => {
			const box = card.getBoundingClientRect();
			return new DOMRect(panel.getBoundingClientRect().left, box.top, 0, box.height);
		},
	};
}

function useVariablePaint(doc: DesignDocument, variable: Variable, paint: string): PaintEdit {
	const [draft, setDraft] = useState<string | null>(null);
	const latest = useRef<string | null>(null);
	return {
		value: draft ?? paint,
		change: (text) => {
			latest.current = text;
			setDraft(text);
		},
		commit: () => {
			if (latest.current !== null) {
				editVariable(doc, DOCUMENT_SCOPE, variable, { initial: latest.current });
			}
			latest.current = null;
			setDraft(null);
		},
	};
}

export function VariableEditor({
	anchor,
	doc,
	fresh,
	onClose,
	onSettled,
	paint,
	variable,
	view,
}: {
	anchor: RefObject<HTMLElement | null>;
	doc: DesignDocument;
	variable: Variable;
	paint: string;
	view: ComponentsView;
	fresh: boolean;
	onClose: () => void;
	onSettled: () => void;
}): ReactElement {
	const edit = useVariablePaint(doc, variable, paint);
	const row = { doc, view, owner: DOCUMENT_SCOPE, variable, locked: false, fresh, onSettled };
	return (
		<Popover.Root
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			open
		>
			<Popover.Portal>
				<Popover.Positioner
					align="start"
					anchor={() => panelEdge(anchor.current)}
					side="left"
					sideOffset={POPUP_GAP}
				>
					<Popover.Popup className="color-popup fill-popup" data-tab={paintOf(edit.value).kind}>
						<div className="fill-editor-head">
							<NameCell {...row} dimmed={false} />
							<RowEnd {...row} />
						</div>
						<PaintPicker edit={edit} target={null} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

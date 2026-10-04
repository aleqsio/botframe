import type { ReactElement } from "react";
import { disconnect, makeComponent, makeFrame } from "../../../document/componentActions";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { PASTE_OFFSET, shiftLayer } from "../../paste";
import type { UserState } from "../../state/userState";
import type { MenuAction } from "./IconMenu";

export interface PanelProps {
	doc: DesignDocument;
	layer: Layer;
	user: UserState;
}

function Action({ label, onPress }: { label: string; onPress: () => void }): ReactElement {
	return (
		<button className="pill-button component-action" onClick={onPress} type="button">
			{label}
		</button>
	);
}

function duplicateAsNew({ doc, layer, user }: PanelProps): void {
	const node = doc.readSubtree(layer.id);
	if (node === null) {
		return;
	}
	const copy = doc.createSubtree(node, layer.parent);
	shiftLayer(doc, copy, PASTE_OFFSET);
	disconnect(doc, copy);
	user.selection.set([copy]);
	doc.commit("duplicate as a new component");
}

export function copyActions(props: PanelProps): readonly MenuAction[] {
	const { doc, layer } = props;
	const run = (message: string, act: () => unknown) => (): void => {
		act();
		doc.commit(message);
	};
	return [
		{ label: "Make frame", run: run("make frame", () => makeFrame(doc, layer.id)) },
		{ label: "Disconnect", run: run("disconnect", () => disconnect(doc, layer.id)) },
		{
			label: "Duplicate as new",
			run: () => {
				duplicateAsNew(props);
			},
		},
	];
}

export function FrameSection({ doc, layer, user }: PanelProps): ReactElement {
	return (
		<div className="field-group layout-section">
			<span className="group-label">Component</span>
			<Action
				label="Make component"
				onPress={() => {
					if (makeComponent(doc, layer.id) !== null) {
						user.selection.set([layer.id]);
						doc.commit("make component");
					}
				}}
			/>
			<p className="panel-note">A component can set variables, and its instances stay in sync.</p>
		</div>
	);
}

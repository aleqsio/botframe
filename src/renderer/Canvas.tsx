import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { LayerView } from "./LayerView";
import { LayerList } from "./components/LayerList";
import { Properties } from "./components/Properties";
import { ToolBar } from "./components/ToolBar";
import { useLayerIds } from "./useDocument";

export function Canvas({ doc }: { doc: DesignDocument }): ReactElement {
	const ids = useLayerIds(doc);
	return (
		<>
			<div id="title-bar" />
			<LayerList />
			<main id="stage">
				{ids.map((id) => (
					<LayerView doc={doc} id={id} key={id} />
				))}
			</main>
			<Properties />
			<ToolBar />
		</>
	);
}

import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import { LayerView } from "./LayerView";
import { ToolBar } from "./components/ToolBar";
import { useLayerIds } from "./useDocument";

export function Canvas({ doc }: { doc: DesignDocument }): ReactElement {
	const ids = useLayerIds(doc);
	return (
		<>
			<main id="stage">
				{ids.map((id) => (
					<LayerView doc={doc} id={id} key={id} />
				))}
			</main>
			<ToolBar />
		</>
	);
}

import type { ReactElement } from "react";
import type { DesignDocument } from "../../../document/document";
import type { Layer } from "../../../document/layer";
import { useLayer } from "../../useDocument";
import { DisplaySection } from "./DisplaySection";
import { PaddingSection } from "./PaddingSection";
import { SelfSection } from "./SelfSection";

export function LayoutPanel({ doc, layer }: { doc: DesignDocument; layer: Layer }): ReactElement {
	const parent = useLayer(doc, layer.parent);

	return (
		<>
			<SelfSection doc={doc} layer={layer} parent={parent?.layout ?? null} />
			<PaddingSection doc={doc} layer={layer} />
			<DisplaySection doc={doc} layer={layer} />
		</>
	);
}

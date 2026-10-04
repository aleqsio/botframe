import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer } from "../document/layer";
import type { AssetUrl } from "./assetUrl";
import type { TextEditSlots } from "./input/textEdit";
import { LayerPaint } from "./LayerPaint";
import { LayerText } from "./LayerText";
import { usePicked } from "./state/useSlot";

export function LayerBody({
	doc,
	layer,
	media,
	slots,
}: {
	doc: DesignDocument;
	layer: Layer;
	media: AssetUrl | null;
	slots: TextEditSlots;
}): ReactElement {
	const editing = usePicked(slots.textEdit, (edit) => edit?.id === layer.id);

	if (layer.geometry.kind !== "text") {
		return <LayerPaint layer={layer} media={media} />;
	}
	return (
		<LayerText
			doc={doc}
			editing={editing}
			geometry={layer.geometry}
			layer={layer}
			media={media}
			slots={slots}
		/>
	);
}

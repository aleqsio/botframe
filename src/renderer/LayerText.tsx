import { useEffect } from "react";
import type { ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { Layer } from "../document/layer";
import type { TextGeometry } from "../document/text";
import type { AssetUrl } from "./assetUrl";
import { ensureFont } from "./fonts/fontLoad";
import { editorText } from "./input/textEdit";
import type { TextEditSlots } from "./input/textEdit";
import { paintedStyle } from "./mediaStyle";
import { TextEditor } from "./TextEditor";
import { textPaintStyle } from "./textStyle";

export function LayerText({
	doc,
	editing,
	geometry,
	layer,
	media,
	slots,
}: {
	doc: DesignDocument;
	editing: boolean;
	geometry: TextGeometry;
	layer: Layer;
	media: AssetUrl | null;
	slots: TextEditSlots;
}): ReactElement {
	const { fontFamily: family, fontWeight: weight, italic } = geometry;
	useEffect(() => {
		void ensureFont(doc, { family, italic, weight });
	}, [doc, family, italic, weight]);
	const paint = textPaintStyle(paintedStyle({ background: layer.fill }, layer.media, media));
	// React sets only the changed `background` shorthand, and the browser then resets `background-clip`. A new element for each paint keeps the clip.
	// https://github.com/facebook/react/issues/6348
	const paintKey = String(paint.background);

	if (editing) {
		return (
			<TextEditor
				content={geometry.content}
				doc={doc}
				id={layer.id}
				key={paintKey}
				paint={paint}
				slots={slots}
			/>
		);
	}

	return (
		<span className="layer-text" data-layer-id={layer.id} key={paintKey} style={paint}>
			{editorText(geometry.content)}
		</span>
	);
}

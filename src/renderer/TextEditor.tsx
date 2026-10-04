import { useCallback, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { DesignDocument } from "../document/document";
import type { LayerId } from "../document/layer";
import { editedText, editorText, endTextEdit, typeText } from "./input/textEdit";
import type { TextEditSlots } from "./input/textEdit";

const END_KEY = "Escape";

interface EditorTarget {
	doc: DesignDocument;
	id: LayerId;
	slots: TextEditSlots;
}

function listen(element: HTMLSpanElement, target: EditorTarget): () => void {
	const { doc, id, slots } = target;
	const controller = new AbortController();
	const options = { signal: controller.signal };
	element.addEventListener(
		"input",
		() => {
			typeText(doc, id, editedText(element.textContent));
		},
		options,
	);
	element.addEventListener(
		"blur",
		() => {
			endTextEdit(doc, slots);
		},
		options,
	);
	element.addEventListener(
		"keydown",
		(event) => {
			if (event.key === END_KEY) {
				event.preventDefault();
				element.blur();
			}
		},
		options,
	);
	element.addEventListener(
		"pointerdown",
		(event) => {
			event.stopPropagation();
		},
		options,
	);
	return () => {
		controller.abort();
	};
}

export function TextEditor({
	content,
	doc,
	id,
	paint,
	slots,
}: {
	content: string;
	doc: DesignDocument;
	id: LayerId;
	paint: CSSProperties;
	slots: TextEditSlots;
}): ReactElement {
	const start = useRef({ content, target: { doc, id, slots } });
	const mount = useCallback((element: HTMLSpanElement) => {
		element.textContent = editorText(start.current.content);
		const stop = listen(element, start.current.target);
		element.focus();
		window.getSelection()?.selectAllChildren(element);
		return stop;
	}, []);

	return (
		<span
			className="layer-text"
			contentEditable="plaintext-only"
			data-layer-id={id}
			ref={mount}
			style={paint}
			suppressContentEditableWarning
		/>
	);
}

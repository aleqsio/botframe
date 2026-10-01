import { useMemo } from "react";
import type { DesignDocument } from "../document/document";
import { htmlMarkupOf } from "../document/htmlMarkup";
import { PLAIN_INSTANCE } from "../document/layer";
import type { LayerContent } from "../document/layer";
import { isLiteral } from "../document/value";

const EDITOR_STYLE = "<style>:host > :not(slot) { pointer-events: none; }</style>";
const EMPTY_SHADOW = "<slot></slot>";

function markupSize(markup: string): { width: number; height: number } {
	const probe = document.createElement("div");
	probe.style.cssText =
		"position: absolute; visibility: hidden; display: flex; width: fit-content; height: fit-content";
	probe.attachShadow({ mode: "open" }).setHTMLUnsafe(markup);
	document.body.append(probe);
	const size = { width: probe.offsetWidth, height: probe.offsetHeight };
	probe.remove();
	return size;
}

export function initialSize(
	doc: DesignDocument,
	component: string,
): { width: number; height: number } {
	const values = Object.fromEntries(
		doc.components
			.scope(component)
			.variables()
			.flatMap((variable) =>
				isLiteral(variable.initial) ? [[variable.id, variable.initial] as const] : [],
			),
	);
	const content = {
		kind: "component",
		component,
		props: {},
		values,
		instance: PLAIN_INSTANCE,
	} as const;
	return markupSize(htmlMarkupOf(doc.components, content) ?? "");
}

function shadowWriter(markup: string | null): (element: HTMLElement | null) => void {
	return (element) => {
		if (element === null) {
			return;
		}
		if (markup === null) {
			element.shadowRoot?.setHTMLUnsafe(EMPTY_SHADOW);
			return;
		}
		const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
		root.setHTMLUnsafe(`${EDITOR_STYLE}${markup}`);
	};
}

export function useShadowWriter(
	doc: DesignDocument,
	content: LayerContent | null,
): (element: HTMLElement | null) => void {
	const markup = content === null ? null : htmlMarkupOf(doc.components, content);
	return useMemo(() => shadowWriter(markup), [markup]);
}

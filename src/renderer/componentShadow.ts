import { useMemo } from "react";
import { componentMarkup } from "../document/component";
import type { Component } from "../document/component";
import type { DesignDocument } from "../document/document";
import type { LayerContent } from "../document/layer";
import { useComponent } from "./useDocument";

const EDITOR_STYLE = "<style>:host > :not(slot) { pointer-events: none; }</style>";
const EMPTY_SHADOW = "<slot></slot>";

export function markupSize(markup: string): { width: number; height: number } {
	const probe = document.createElement("div");
	probe.style.cssText =
		"position: absolute; visibility: hidden; display: flex; width: fit-content; height: fit-content";
	probe.attachShadow({ mode: "open" }).setHTMLUnsafe(markup);
	document.body.append(probe);
	const size = { width: probe.offsetWidth, height: probe.offsetHeight };
	probe.remove();
	return size;
}

function shadowMarkupOf(content: LayerContent, component: Component | null): string | null {
	return content.kind === "component" && component !== null
		? componentMarkup(component, content.props)
		: null;
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
	const component = useComponent(doc, content?.kind === "component" ? content.component : null);
	const markup = content === null ? null : shadowMarkupOf(content, component);
	return useMemo(() => shadowWriter(markup), [markup]);
}

import type { LoroDoc } from "loro-crdt";
import {
	commitMove,
	createDocument,
	getRectangle,
	listRectangles,
	setPosition,
} from "../document/model";
import type { LayerId, Rectangle } from "../document/model";

interface Drag {
	id: LayerId;
	pointerId: number;
	grabX: number;
	grabY: number;
	x: number;
	y: number;
}

interface Editor {
	doc: LoroDoc;
	stage: HTMLElement;
	elements: Map<LayerId, HTMLElement>;
	drag: Drag | null;
	frame: number;
}

const layerIds = new WeakMap<HTMLElement, LayerId>();

function paint(element: HTMLElement, rectangle: Rectangle): void {
	element.style.transform = `translate3d(${rectangle.x}px, ${rectangle.y}px, 0)`;
	element.style.width = `${rectangle.width}px`;
	element.style.height = `${rectangle.height}px`;
	element.style.background = rectangle.fill;
}

function resolveElement(editor: Editor, rectangle: Rectangle): HTMLElement {
	const existing = editor.elements.get(rectangle.id);
	if (existing !== undefined) {
		return existing;
	}
	const element = document.createElement("div");
	element.className = "layer";
	editor.stage.append(element);
	editor.elements.set(rectangle.id, element);
	layerIds.set(element, rectangle.id);
	return element;
}

function render(editor: Editor): void {
	for (const rectangle of listRectangles(editor.doc)) {
		paint(resolveElement(editor, rectangle), rectangle);
	}
}

function flush(editor: Editor): void {
	editor.frame = 0;
	const drag = editor.drag;
	if (drag === null) {
		return;
	}
	setPosition(editor.doc, drag.id, drag.x, drag.y);
	render(editor);
}

function findLayer(target: EventTarget | null): HTMLElement | null {
	return target instanceof HTMLElement ? target.closest<HTMLElement>(".layer") : null;
}

function beginDrag(editor: Editor, event: PointerEvent): void {
	const element = findLayer(event.target);
	const id = element === null ? undefined : layerIds.get(element);
	if (element === null || id === undefined) {
		return;
	}
	const rectangle = getRectangle(editor.doc, id);
	if (rectangle === null) {
		return;
	}
	element.setPointerCapture(event.pointerId);
	editor.drag = {
		id,
		pointerId: event.pointerId,
		grabX: event.clientX - rectangle.x,
		grabY: event.clientY - rectangle.y,
		x: rectangle.x,
		y: rectangle.y,
	};
}

function continueDrag(editor: Editor, event: PointerEvent): void {
	const drag = editor.drag;
	if (drag === null || drag.pointerId !== event.pointerId) {
		return;
	}
	drag.x = event.clientX - drag.grabX;
	drag.y = event.clientY - drag.grabY;
	if (editor.frame !== 0) {
		return;
	}
	editor.frame = requestAnimationFrame(() => {
		flush(editor);
	});
}

function endDrag(editor: Editor, event: PointerEvent): void {
	const drag = editor.drag;
	if (drag === null || drag.pointerId !== event.pointerId) {
		return;
	}
	if (editor.frame !== 0) {
		cancelAnimationFrame(editor.frame);
		editor.frame = 0;
	}
	setPosition(editor.doc, drag.id, drag.x, drag.y);
	editor.drag = null;
	render(editor);
	commitMove(editor.doc);
}

function mount(stage: HTMLElement): void {
	const editor: Editor = {
		doc: createDocument(),
		stage,
		elements: new Map(),
		drag: null,
		frame: 0,
	};
	stage.addEventListener("pointerdown", (event) => {
		beginDrag(editor, event);
	});
	stage.addEventListener("pointermove", (event) => {
		continueDrag(editor, event);
	});
	stage.addEventListener("pointerup", (event) => {
		endDrag(editor, event);
	});
	stage.addEventListener("pointercancel", (event) => {
		endDrag(editor, event);
	});
	render(editor);
}

const stage = document.querySelector<HTMLElement>("#stage");
if (stage !== null) {
	mount(stage);
}

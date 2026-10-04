import { describe, expect, it, vi } from "vitest";
import { makeComponent } from "./componentActions";
import { DesignDocument } from "./document";
import { DRAWN, nodeBox } from "./documentFixtures";
import { parseEnvelope, serializeEnvelope } from "./envelope";
import { setInstanceSync } from "./instanceActions";
import type { LayerFields, LayerId } from "./layer";
import type { LayerNode } from "./subtree";
import { DEFAULT_TEXT_STYLE, textGeometryOf } from "./text";
import type { TextGeometry } from "./text";

const HELLO: TextGeometry = { kind: "text", content: "Hello world", ...DEFAULT_TEXT_STYLE };

const TEXT_FIELDS: LayerFields = {
	x: 10,
	y: 20,
	width: 120,
	height: 24,
	fill: "#111111",
	name: "Hello",
	clip: false,
	geometry: HELLO,
};

function textOf(doc: DesignDocument, id: LayerId): TextGeometry {
	const geometry = doc.layer(id)?.geometry;
	if (geometry?.kind !== "text") {
		throw new Error("expected a text layer");
	}
	return geometry;
}

function withText(): { doc: DesignDocument; id: LayerId } {
	const doc = DesignDocument.create();
	const id = doc.createLayer(TEXT_FIELDS);
	doc.commit("create text");
	return { doc, id };
}

function subtreeOf(doc: DesignDocument, id: LayerId): LayerNode {
	const node = doc.readSubtree(id);
	if (node === null) {
		throw new Error("expected a subtree");
	}
	return node;
}

describe("a text layer", () => {
	it("reads back the content and the style that it was created with", () => {
		const { doc, id } = withText();

		expect(textOf(doc, id)).toEqual(HELLO);
	});

	it("keeps the edits of two peers that type in the same text at the same time", () => {
		const { doc, id } = withText();
		const peer = DesignDocument.open(doc.snapshot());
		doc.update(id, { geometry: { ...HELLO, content: "Hello brave world" } });
		doc.commit("edit text");
		peer.update(id, { geometry: { ...HELLO, content: "Hello world!" } });
		peer.commit("edit text");

		doc.merge(peer.snapshot());

		expect(textOf(doc, id).content).toBe("Hello brave world!");
	});

	it("keeps the text of a peer when a different peer changes the style", () => {
		const { doc, id } = withText();
		const peer = DesignDocument.open(doc.snapshot());
		doc.update(id, { geometry: { ...HELLO, fontSize: 32 } });
		doc.commit("change size");
		peer.update(id, { geometry: { ...HELLO, content: "Goodbye" } });
		peer.commit("edit text");

		doc.merge(peer.snapshot());

		expect(textOf(doc, id)).toMatchObject({ content: "Goodbye", fontSize: 32 });
	});

	it("notifies the layer when the content changes", () => {
		const { doc, id } = withText();
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(id, listener);

		doc.update(id, { geometry: { ...HELLO, content: "Hi" } });

		expect(listener).toHaveBeenCalled();
		expect(textOf(doc, id).content).toBe("Hi");
	});

	it("uses the default style for a stored value that is not valid", () => {
		const stored: Readonly<Record<string, unknown>> = {
			content: 7,
			fontSize: -4,
			fontWeight: 4000,
			textAlign: "sideways",
			lineHeight: "tall",
		};

		expect(textGeometryOf({ get: (key) => stored[key] })).toMatchObject({
			content: "",
			fontSize: DEFAULT_TEXT_STYLE.fontSize,
			fontWeight: 1000,
			textAlign: DEFAULT_TEXT_STYLE.textAlign,
			lineHeight: DEFAULT_TEXT_STYLE.lineHeight,
		});
	});

	it("survives a copy through the clipboard envelope", () => {
		const node: LayerNode = {
			fields: TEXT_FIELDS,
			rotation: 0,
			skewX: 0,
			skewY: 0,
			mirrored: false,
			...nodeBox(TEXT_FIELDS),
			children: [],
		};
		const raw = serializeEnvelope({
			sourceParent: null,
			sourceIds: [],
			layers: [node],
			components: {},
		});

		expect(parseEnvelope(raw)?.layers[0]?.fields.geometry).toEqual(HELLO);
	});

	it("keeps its text in a duplicate", () => {
		const { doc, id } = withText();
		const copy = doc.createSubtree(subtreeOf(doc, id), null);

		expect(textOf(doc, copy)).toEqual(HELLO);
	});

	it("keeps an edit of the text inside one copy of a component", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer(DRAWN, null);
		doc.createLayer(TEXT_FIELDS, frame);
		doc.commit("draw");
		makeComponent(doc, frame);
		doc.commit("make component");
		const copy = doc.createSubtree(subtreeOf(doc, frame), null);
		setInstanceSync(doc, copy, "none");
		const [source = frame] = doc.childIds(frame);
		const [inside = copy] = doc.childIds(copy);

		doc.update(inside, { geometry: { ...HELLO, content: "Hello copy" } });
		doc.update(inside, { geometry: { ...HELLO, content: "Hello copy again" } });
		doc.commit("edit copy");

		expect(textOf(doc, inside).content).toBe("Hello copy again");
		expect(textOf(doc, source).content).toBe(HELLO.content);
	});
});

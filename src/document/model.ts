import { LoroDoc } from "loro-crdt";
import type { LoroMap, TreeID } from "loro-crdt";

export type LayerId = TreeID;

export interface Rectangle {
	id: LayerId;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
}

const LAYERS = "layers";

function readNumber(data: LoroMap, key: string, fallback: number): number {
	const value = data.get(key);
	return typeof value === "number" ? value : fallback;
}

function readString(data: LoroMap, key: string, fallback: string): string {
	const value = data.get(key);
	return typeof value === "string" ? value : fallback;
}

export function createDocument(): LoroDoc {
	const doc = new LoroDoc();
	const node = doc.getTree(LAYERS).createNode();
	node.data.set("x", 420);
	node.data.set("y", 260);
	node.data.set("width", 240);
	node.data.set("height", 160);
	node.data.set("fill", "#000000");
	doc.commit({ message: "create rectangle" });
	return doc;
}

export function listRectangles(doc: LoroDoc): Rectangle[] {
	return doc
		.getTree(LAYERS)
		.getNodes()
		.map((node) => ({
			id: node.id,
			x: readNumber(node.data, "x", 0),
			y: readNumber(node.data, "y", 0),
			width: readNumber(node.data, "width", 0),
			height: readNumber(node.data, "height", 0),
			fill: readString(node.data, "fill", "#000000"),
		}));
}

export function setPosition(doc: LoroDoc, id: LayerId, x: number, y: number): void {
	const node = doc.getTree(LAYERS).getNodeByID(id);
	if (node === undefined) {
		return;
	}
	node.data.set("x", x);
	node.data.set("y", y);
}

export function commitMove(doc: LoroDoc): void {
	doc.commit({ message: "move rectangle" });
}

export function getRectangle(doc: LoroDoc, id: LayerId): Rectangle | null {
	return listRectangles(doc).find((rectangle) => rectangle.id === id) ?? null;
}

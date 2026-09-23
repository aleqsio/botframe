import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../../document/document";
import type { LayerFields, LayerId } from "../../../document/layer";
import { resetChildren } from "./resetChildren";

const CHILD: LayerFields = {
	x: 30,
	y: 40,
	width: 60,
	height: 50,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

interface Scene {
	doc: DesignDocument;
	parent: LayerId;
	offset: LayerId;
	absolute: LayerId;
}

function scene(): Scene {
	const doc = DesignDocument.create();
	const parent = doc.createLayer({ ...CHILD, x: 0, y: 0, width: 300, height: 200 });
	const offset = doc.createLayer(CHILD, parent);
	const absolute = doc.createLayer(CHILD, parent);
	doc.update(offset, { layout: { position: "offset" } });
	doc.update(absolute, { layout: { position: "absolute" } });
	doc.commit("set up the children");
	return { doc, parent, offset, absolute };
}

describe("resetChildren", () => {
	it("puts every child back in the flow when the parent leaves Block", () => {
		const { doc, parent, offset, absolute } = scene();

		resetChildren(doc, parent, "block");

		expect(doc.layer(offset)).toMatchObject({ x: 0, y: 0 });
		expect(doc.layer(offset)?.layout.position).toBe("default");
		expect(doc.layer(absolute)).toMatchObject({ x: 0, y: 0 });
		expect(doc.layer(absolute)?.layout.position).toBe("default");
	});

	it("keeps an absolute child when the parent goes from one flex display to another", () => {
		const { doc, parent, offset, absolute } = scene();

		resetChildren(doc, parent, "row");

		expect(doc.layer(offset)).toMatchObject({ x: 0, y: 0 });
		expect(doc.layer(offset)?.layout.position).toBe("default");
		expect(doc.layer(absolute)).toMatchObject({ x: 30, y: 40 });
		expect(doc.layer(absolute)?.layout.position).toBe("absolute");
	});
});

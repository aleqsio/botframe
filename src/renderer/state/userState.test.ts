import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { Slot } from "./slot";
import { NOTHING_SELECTED, toggleSelected } from "./userState";

const FIRST: LayerId = "1@1";
const SECOND: LayerId = "2@1";

describe("toggleSelected", () => {
	it("adds a layer that the selection does not hold at the end", () => {
		const selection = new Slot<readonly LayerId[]>([FIRST]);

		toggleSelected(selection, SECOND);

		expect(selection.get()).toEqual([FIRST, SECOND]);
	});

	it("takes a layer that the selection holds out of it", () => {
		const selection = new Slot<readonly LayerId[]>([FIRST, SECOND]);

		toggleSelected(selection, FIRST);

		expect(selection.get()).toEqual([SECOND]);
	});

	it("gives the shared empty selection when the last layer leaves", () => {
		const selection = new Slot<readonly LayerId[]>([FIRST]);

		toggleSelected(selection, FIRST);

		expect(selection.get()).toBe(NOTHING_SELECTED);
	});
});

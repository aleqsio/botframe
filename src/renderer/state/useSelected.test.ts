import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { Slot } from "./slot";
import { isSelected } from "./useSelected";

const FIRST: LayerId = "1@1";
const SECOND: LayerId = "2@1";

describe("isSelected", () => {
	it("gives one layer the same answer when a different layer joins the selection", () => {
		const selection = new Slot<readonly LayerId[]>([]);

		expect(isSelected(selection.get(), FIRST)).toBe(false);
		selection.set([SECOND]);
		expect(isSelected(selection.get(), FIRST)).toBe(false);
		selection.set([SECOND, FIRST]);
		expect(isSelected(selection.get(), FIRST)).toBe(true);
		selection.set([FIRST]);
		expect(isSelected(selection.get(), FIRST)).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import type { ComponentsView } from "../../../document/components";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { groupsOf, kindOf, starterCondition } from "./reach";

function variable(id: string, held: Pick<Variable, "type"> & Partial<Variable>): Variable {
	return { id, name: id, initial: "", options: [], ...held };
}

const SCOPES: Readonly<Record<string, readonly Variable[]>> = {
	[DOCUMENT_SCOPE]: [variable("ink", { type: "color" }), variable("dark", { type: "boolean" })],
	card: [
		variable("accent", { type: "color" }),
		variable("status", { type: "choice", options: ["passed", "failed"] }),
	],
};

const VIEW: ComponentsView = {
	entries: [],
	entry: (id) => (id === "card" ? { id, name: "Card", body: { kind: "html", source: "" } } : null),
	declared: () => null,
	variables: (owner) => SCOPES[owner] ?? [],
};

const REACH = { view: VIEW, owners: [DOCUMENT_SCOPE, "card"] };

describe("groupsOf", () => {
	it("lists the props of the enclosing component before the document variables", () => {
		const groups = groupsOf(REACH, "color");

		expect(groups.map((group) => group.label)).toEqual(["Card", "Document"]);
		expect(groups.map((group) => group.variables.map((held) => held.id))).toEqual([
			["accent"],
			["ink"],
		]);
	});
});

describe("starterCondition", () => {
	it("tests the first choice or switch in reach and keeps the current value in each branch", () => {
		expect(starterCondition(REACH, "#ffffff")).toEqual({
			when: [{ test: "status", is: "passed", result: "#ffffff" }],
			else: "#ffffff",
		});
		expect(starterCondition({ view: VIEW, owners: [DOCUMENT_SCOPE] }, 4)).toEqual({
			when: [{ test: "dark", is: true, result: 4 }],
			else: 4,
		});
	});
});

describe("kindOf", () => {
	it("tells a plain value from a variable and a condition", () => {
		expect(kindOf(3)).toBe("value");
		expect(kindOf({ var: "ink" })).toBe("variable");
		expect(kindOf({ when: [], else: 3 })).toBe("condition");
	});
});

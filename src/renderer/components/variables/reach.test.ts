import { describe, expect, it } from "vitest";
import type { ComponentsView } from "../../../document/components";
import type { Declared, ResolveSource } from "../../../document/resolve";
import { DOCUMENT_SCOPE } from "../../../document/variable";
import type { Variable } from "../../../document/variable";
import { groupsOf, kindOf, literalText, nearestOf, starterCondition } from "./reach";

function variable(id: string, held: Pick<Variable, "type"> & Partial<Variable>): Variable {
	return { id, name: id, initial: "", options: [], ...held };
}

const SCOPES: Readonly<Record<string, readonly Variable[]>> = {
	[DOCUMENT_SCOPE]: [
		variable("ink", { type: "color", initial: "#ff0000" }),
		variable("dark", { type: "boolean" }),
	],
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

function declared(id: string): Declared | null {
	for (const [owner, variables] of Object.entries(SCOPES)) {
		const found = variables.find((held) => held.id === id);
		if (found !== undefined) {
			return { variable: found, owner };
		}
	}
	return null;
}

const SOURCE: ResolveSource = {
	declared,
	assigned: (copy, id) => (copy === "hero" && id === "accent" ? { var: "ink" } : undefined),
	componentOf: (copy) => (copy === "hero" ? "card" : null),
};

const REACH = { view: VIEW, owners: [DOCUMENT_SCOPE, "card"], source: SOURCE, chain: [] };

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

function made(): string {
	return "made";
}

describe("starterCondition", () => {
	it("tests the first choice or switch in reach and keeps the current value in each branch", () => {
		expect(starterCondition(REACH, "#ffffff", made)).toEqual({
			when: [{ test: "status", is: "passed", result: "#ffffff" }],
			else: "#ffffff",
		});
		expect(starterCondition({ ...REACH, owners: [DOCUMENT_SCOPE] }, 4, made)).toEqual({
			when: [{ test: "dark", is: true, result: 4 }],
			else: 4,
		});
	});

	it("makes a switch to test when no variable is in reach", () => {
		const empty = { ...REACH, view: { ...VIEW, variables: () => [] } };

		expect(starterCondition(empty, 4, made)).toEqual({
			when: [{ test: "made", is: true, result: 4 }],
			else: 4,
		});
	});
});

describe("nearestOf", () => {
	it("gives the value in the copy chain and the variable that it comes from", () => {
		expect(nearestOf({ ...REACH, chain: ["hero"] }, "accent")).toEqual({
			value: "#ff0000",
			held: { var: "ink" },
		});
		expect(nearestOf(REACH, "accent")).toEqual({ value: "", held: "" });
	});
});

describe("kindOf", () => {
	it("tells a plain value from a variable and a condition", () => {
		expect(kindOf(3)).toBe("value");
		expect(kindOf({ var: "ink" })).toBe("variable");
		expect(kindOf({ when: [], else: 3 })).toBe("condition");
	});
});

describe("literalText", () => {
	it("names a gradient by its shape and its stops", () => {
		expect(literalText("linear-gradient(180deg, #ffc21a 0%, #f24822 100%)")).toBe(
			"Linear · 2 stops",
		);
	});

	it("keeps a color and a switch as text", () => {
		expect(literalText("#0d99ff")).toBe("#0d99ff");
		expect(literalText(true)).toBe("on");
	});
});

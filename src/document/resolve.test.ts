import { describe, expect, it } from "vitest";
import { resolveValue, resolveVariable } from "./resolve";
import type { Declared, ResolveSource } from "./resolve";
import type { Condition, VariableValue } from "./value";
import { DOCUMENT_SCOPE } from "./variable";
import type { Variable } from "./variable";

type Owned = Variable & { owner: string };

interface World {
	variables: readonly Owned[];
	copies: Readonly<Record<string, { component: string; props: Record<string, VariableValue> }>>;
}

function variable(
	id: string,
	owner: string,
	held: Pick<Variable, "type" | "initial"> & { options?: readonly string[] },
): Owned {
	return { id, name: id, options: [], owner, ...held };
}

function when(test: string, is: string, result: string, otherwise: string): Condition {
	return { when: [{ test, is, result }], else: otherwise };
}

function sourceOf(world: World): ResolveSource {
	const declared = (id: string): Declared | null => {
		const found = world.variables.find((held) => held.id === id);
		return found === undefined ? null : { variable: found, owner: found.owner };
	};
	return {
		declared,
		assigned: (copy, id) => world.copies[copy]?.props[id],
		componentOf: (copy) => world.copies[copy]?.component ?? null,
	};
}

const MODE = variable("mode", DOCUMENT_SCOPE, {
	type: "choice",
	initial: "light",
	options: ["light", "dark"],
});
const SURFACE = variable("surface", DOCUMENT_SCOPE, {
	type: "color",
	initial: when("mode", "dark", "#111111", "#ffffff"),
});
const TONE = variable("tone", "card", {
	type: "choice",
	initial: "neutral",
	options: ["neutral", "danger"],
});
const BACKGROUND = variable("bg", "card", {
	type: "color",
	initial: when("tone", "danger", "#ff0000", "#eeeeee"),
});
const VARIANT = variable("variant", "button", {
	type: "choice",
	initial: "plain",
	options: ["plain", "neutral", "danger"],
});

const WORLD: World = {
	variables: [MODE, SURFACE, TONE, BACKGROUND, VARIANT],
	copies: {
		card: { component: "card", props: { tone: "danger" } },
		plainCard: { component: "card", props: {} },
		button: { component: "button", props: { variant: { var: "tone" } } },
		mapped: { component: "button", props: { variant: when("tone", "danger", "danger", "plain") } },
		screen: { component: "screen", props: { mode: "dark" } },
	},
};

describe("resolveVariable", () => {
	it("gives the default when no copy sets the variable", () => {
		expect(resolveVariable(sourceOf(WORLD), "surface", [])).toBe("#ffffff");
		expect(resolveVariable(sourceOf(WORLD), "tone", ["plainCard"])).toBe("neutral");
	});

	it("resolves a default that is a condition on a prop of the same copy", () => {
		expect(resolveVariable(sourceOf(WORLD), "bg", ["card"])).toBe("#ff0000");
		expect(resolveVariable(sourceOf(WORLD), "bg", ["plainCard"])).toBe("#eeeeee");
	});

	it("follows a prop that uses a variable or a condition of the outer component", () => {
		const source = sourceOf(WORLD);

		expect(resolveVariable(source, "variant", ["button", "card"])).toBe("danger");
		expect(resolveVariable(source, "variant", ["button", "plainCard"])).toBe("neutral");
		expect(resolveVariable(source, "variant", ["mapped", "card"])).toBe("danger");
		expect(resolveVariable(source, "variant", ["mapped", "plainCard"])).toBe("plain");
	});

	it("switches a document variable for the layers inside a copy that sets its mode", () => {
		expect(resolveVariable(sourceOf(WORLD), "surface", ["card", "screen"])).toBe("#111111");
		expect(resolveVariable(sourceOf(WORLD), "surface", ["card"])).toBe("#ffffff");
	});

	it("does not let a copy outside a component set a variable of that component", () => {
		const world: World = {
			...WORLD,
			copies: { ...WORLD.copies, outer: { component: "screen", props: { tone: "danger" } } },
		};

		expect(resolveVariable(sourceOf(world), "tone", ["plainCard", "outer"])).toBe("neutral");
	});

	it("gives the default for a value of the wrong type, and null for a loop", () => {
		const world: World = {
			variables: [
				variable("a", DOCUMENT_SCOPE, { type: "number", initial: { var: "b" } }),
				variable("b", DOCUMENT_SCOPE, { type: "number", initial: { var: "a" } }),
				variable("c", "card", { type: "number", initial: 3 }),
			],
			copies: { card: { component: "card", props: { c: "three" } } },
		};

		expect(resolveVariable(sourceOf(world), "a", [])).toBeNull();
		expect(resolveVariable(sourceOf(world), "c", ["card"])).toBe(3);
		expect(resolveVariable(sourceOf(world), "gone", [])).toBeNull();
	});
});

describe("resolveValue", () => {
	it("takes the first case that matches, and else when no case matches", () => {
		const value: Condition = {
			when: [
				{ test: "tone", is: "danger", result: { var: "surface" } },
				{ test: "tone", is: "danger", result: "#000000" },
			],
			else: "#00ff00",
		};

		expect(resolveValue(sourceOf(WORLD), value, ["card", "screen"])).toBe("#111111");
		expect(resolveValue(sourceOf(WORLD), value, ["plainCard"])).toBe("#00ff00");
	});
});

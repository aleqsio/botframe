import { describe, expect, it } from "vitest";
import { resolveVariable, traceVariable } from "./resolve";
import type { Declared, ResolveSource } from "./resolve";
import { DOCUMENT_SCOPE } from "./variable";
import type { Variable, VariableValue } from "./variable";

type Owned = Variable & { owner: string };

interface World {
	variables: readonly Owned[];
	copies: Readonly<Record<string, { component: string; props: Record<string, VariableValue> }>>;
	cells: Readonly<Record<string, VariableValue>>;
}

function variable(
	id: string,
	owner: string,
	held: Pick<Variable, "type" | "initial"> & { options?: readonly string[] },
): Owned {
	return { id, name: id, options: [], prop: true, owner, ...held };
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
		cell: (owner, choice, option, id) => world.cells[[owner, choice, option, id].join("/")],
		drivingChoice: (owner, id) => {
			const key = Object.keys(world.cells).find(
				(cell) => cell.startsWith(`${owner}/`) && cell.endsWith(`/${id}`),
			);
			return key?.split("/")[1] ?? null;
		},
	};
}

const MODE = variable("mode", DOCUMENT_SCOPE, {
	type: "choice",
	initial: "light",
	options: ["light", "dark"],
});
const SURFACE = variable("surface", DOCUMENT_SCOPE, { type: "color", initial: "#ffffff" });
const TONE = variable("tone", "card", {
	type: "choice",
	initial: "neutral",
	options: ["neutral", "danger"],
});
const BACKGROUND = variable("bg", "card", { type: "color", initial: "#eeeeee" });
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
		screen: { component: "screen", props: { mode: "dark" } },
	},
	cells: {
		"document/mode/dark/surface": "#111111",
		"card/tone/danger/bg": "#ff0000",
	},
};

describe("resolveVariable", () => {
	it("gives the initial value when no copy assigns the variable", () => {
		expect(resolveVariable(sourceOf(WORLD), "surface", [])).toBe("#ffffff");
		expect(resolveVariable(sourceOf(WORLD), "tone", ["plainCard"])).toBe("neutral");
	});

	it("takes the value from the table of the option that the copy picked", () => {
		expect(resolveVariable(sourceOf(WORLD), "bg", ["card"])).toBe("#ff0000");
		expect(resolveVariable(sourceOf(WORLD), "bg", ["plainCard"])).toBe("#eeeeee");
	});

	it("follows a prop that references a variable of the parent component", () => {
		expect(resolveVariable(sourceOf(WORLD), "variant", ["button", "card"])).toBe("danger");
		expect(resolveVariable(sourceOf(WORLD), "variant", ["button", "plainCard"])).toBe("neutral");
	});

	it("switches a document mode for the layers inside a copy that assigns it", () => {
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

	it("gives null for a loop of references and for a value of the wrong type", () => {
		const world: World = {
			...WORLD,
			variables: [
				variable("a", DOCUMENT_SCOPE, { type: "number", initial: { var: "b" } }),
				variable("b", DOCUMENT_SCOPE, { type: "number", initial: { var: "a" } }),
				variable("c", DOCUMENT_SCOPE, { type: "number", initial: { var: "surface" } }),
				SURFACE,
			],
		};

		expect(resolveVariable(sourceOf(world), "a", [])).toBeNull();
		expect(resolveVariable(sourceOf(world), "c", [])).toBeNull();
		expect(resolveVariable(sourceOf(world), "gone", [])).toBeNull();
	});

	it("tells where a value comes from: a copy, a table cell, or a default", () => {
		const source = sourceOf(WORLD);

		expect(traceVariable(source, "variant", ["button", "card"])?.origin).toEqual({
			kind: "assigned",
			copy: "card",
			variable: "tone",
		});
		expect(traceVariable(source, "bg", ["card"])?.origin).toEqual({
			kind: "table",
			owner: "card",
			choice: "tone",
			option: "danger",
			variable: "bg",
		});
		expect(traceVariable(source, "surface", [])?.origin).toEqual({
			kind: "initial",
			owner: DOCUMENT_SCOPE,
			variable: "surface",
		});
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayerId } from "../../document/layer";
import { AGENT_TOOLS } from "../../shared/agent";
import type { AgentReply } from "../../shared/agent";
import { Tab } from "../state/tab";
import { Workspace } from "../state/workspace";
import { runTool } from "./tools";

let calls = 0;

async function call(workspace: Workspace, tool: string, args: unknown = {}): Promise<unknown> {
	calls += 1;
	const reply: AgentReply = await runTool(workspace, { id: calls, tool, args });
	if (!reply.ok) {
		throw new Error(reply.error);
	}
	return reply.result;
}

function firstLayer(workspace: Workspace): LayerId {
	const [id] = workspace.active.get().doc.rootIds();
	if (id === undefined) {
		throw new Error("no layer");
	}
	return id;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("runTool", () => {
	it("has a handler for each tool that the server lists", async () => {
		const workspace = new Workspace(Tab.untitled());
		const replies = await Promise.all(
			AGENT_TOOLS.map(({ name }) => runTool(workspace, { id: 1, tool: name, args: {} })),
		);
		expect(replies.filter((reply) => JSON.stringify(reply).includes("has no tool"))).toEqual([]);
	});

	it("creates, changes, and reads a layer, with one undo step for each call", async () => {
		const workspace = new Workspace(Tab.untitled());
		const parent = firstLayer(workspace);
		await call(workspace, "update_layer", { id: parent, change: { geometry: { frame: true } } });
		const created = await call(workspace, "create_layers", {
			parent,
			layers: [{ name: "Dot", width: 10, height: 10, geometry: { kind: "ellipse" } }],
		});
		expect(created).toMatchObject({ ids: [expect.any(String)] });
		const [id] = workspace.active.get().doc.childIds(parent);
		await call(workspace, "update_layer", { id, change: { fill: "#ff0000" } });
		expect(await call(workspace, "get_layer", { id })).toMatchObject({
			name: "Dot",
			fill: "#ff0000",
			parent,
		});
		await call(workspace, "undo");
		expect(await call(workspace, "get_layer", { id })).toMatchObject({ fill: "#000000" });
	});

	it("does not commit the open gesture of the user on a read", async () => {
		const workspace = new Workspace(Tab.untitled());
		const { doc } = workspace.active.get();
		doc.update(firstLayer(workspace), { x: 1 });
		await call(workspace, "get_outline");
		expect(doc.canUndo()).toBe(false);
	});

	it("gives the outline of the canvas", async () => {
		const workspace = new Workspace(Tab.untitled());
		expect(await call(workspace, "get_outline")).toEqual([
			{ id: firstLayer(workspace), name: "", kind: "rectangle", children: [] },
		]);
	});

	it("writes raw data and adds a variable", async () => {
		const workspace = new Workspace(Tab.untitled());
		const id = firstLayer(workspace);
		await call(workspace, "write_data", { path: ["layers", id, "name"], value: "Raw" });
		const variable = await call(workspace, "set_variable", {
			name: "Brand",
			type: "color",
			initial: "#123456",
		});
		expect(variable).toMatchObject({ name: "Brand", initial: "#123456" });
		expect(await call(workspace, "list_components")).toMatchObject({
			variables: { document: [{ name: "Brand" }] },
		});
		expect(await call(workspace, "get_layer", { id })).toMatchObject({ name: "Raw" });
	});

	it("keeps text that looks like a number, and refuses a value of the wrong type", async () => {
		const workspace = new Workspace(Tab.untitled());
		const typed = await call(workspace, "set_variable", {
			name: "Weight",
			type: "text",
			initial: 400,
		});
		expect(typed).toMatchObject({ initial: "400" });
		const quoted = await call(workspace, "set_variable", {
			name: "Age",
			type: "text",
			initial: "17",
		});
		expect(quoted).toMatchObject({ initial: "17" });
		await expect(
			call(workspace, "set_variable", { name: "Size", type: "number", initial: "big" }),
		).rejects.toThrow('The initial value "big" does not fit the type number.');
	});

	it("makes the scope of a component that has none, and names an owner that is missing", async () => {
		const workspace = new Workspace(Tab.untitled());
		await call(workspace, "write_data", {
			path: ["components", "c1"],
			value: { $map: { name: "Card", kind: "html", source: "a1" } },
		});
		const added = await call(workspace, "set_variable", {
			owner: "c1",
			name: "title",
			type: "text",
			initial: "Hi",
		});
		expect(added).toMatchObject({ name: "title" });
		await expect(
			call(workspace, "set_variable", { owner: "nope", name: "x", type: "text", initial: "" }),
		).rejects.toThrow("No component has the id nope.");
	});

	it("adds an HTML component and sets the props of a copy by name", async () => {
		const workspace = new Workspace(Tab.untitled());
		const made = await call(workspace, "create_html_component", {
			name: "Badge",
			html: "<span>{{label}}</span>{{#hot}}!{{/hot}}",
			css: "span { font-weight: 600; }",
			props: [
				{ name: "label", kind: "text", initial: "New" },
				{ name: "hot", kind: "boolean", initial: false },
			],
		});
		expect(made).toMatchObject({ props: [{ name: "hot" }, { name: "label" }] });
		const [entry] = workspace.active.get().doc.components.entries();
		const component = entry?.id ?? "";
		expect(made).toMatchObject({ component });
		await call(workspace, "create_layers", {
			parent: null,
			layers: [
				{
					name: "Badge 1",
					width: 80,
					height: 24,
					content: { kind: "component", component, props: { label: "Sale" } },
				},
			],
		});
		const layers = await call(workspace, "get_outline");
		expect(JSON.stringify(layers)).toContain(component);
		await expect(
			call(workspace, "create_layers", {
				parent: null,
				layers: [{ content: { kind: "component", component, props: { colour: "red" } } }],
			}),
		).rejects.toThrow("The component has no prop colour. Its props: hot, label.");
	});

	it("makes and changes a text layer", async () => {
		const workspace = new Workspace(Tab.untitled());
		const text = { kind: "text", content: "Hello", fontFamily: "Inter", fontSize: 24 };
		await call(workspace, "create_layers", {
			parent: null,
			layers: [{ name: "Title", layout: { width: "hug", height: "hug" }, geometry: text }],
		});
		const [, id] = workspace.active.get().doc.rootIds();
		await call(workspace, "update_layer", {
			id,
			change: { geometry: { ...text, content: "Hello agent", textAlign: "center" } },
		});

		expect(await call(workspace, "get_layer", { id })).toMatchObject({
			geometry: { kind: "text", content: "Hello agent", fontSize: 24, textAlign: "center" },
		});
	});

	it("makes a layer with children a frame", async () => {
		const workspace = new Workspace(Tab.untitled());
		await call(workspace, "create_layers", {
			parent: null,
			layers: [{ name: "Card", layout: { display: "column" }, children: [{ name: "Title" }] }],
		});
		const outline = await call(workspace, "get_outline");
		expect(outline).toMatchObject([
			{},
			{ name: "Card", kind: "frame", children: [{ kind: "rectangle" }] },
		]);
	});

	it("puts layers only in a frame or a group, as the editor does", async () => {
		const workspace = new Workspace(Tab.untitled());
		const rectangle = firstLayer(workspace);
		await expect(
			call(workspace, "create_layers", { parent: rectangle, layers: [{ name: "Child" }] }),
		).rejects.toThrow(
			`Only a frame or a group can hold layers, as in the editor. ${rectangle} is a rectangle.`,
		);
		await expect(
			call(workspace, "create_layers", {
				parent: null,
				layers: [{ name: "Dot", geometry: { kind: "ellipse" }, children: [{ name: "Child" }] }],
			}),
		).rejects.toThrow('Give "Dot" geometry {kind: rectangle, frame: true} or {kind: group}.');
		await call(workspace, "create_layers", {
			parent: null,
			layers: [{ name: "Box", children: [{ name: "Child" }] }],
		});
		const [, box] = workspace.active.get().doc.rootIds();
		const [child] = workspace.active.get().doc.childIds(box ?? rectangle);
		await expect(call(workspace, "move_layer", { id: child, parent: rectangle })).rejects.toThrow(
			/is a rectangle/u,
		);
		await expect(
			call(workspace, "update_layer", { id: box, change: { geometry: { frame: false } } }),
		).rejects.toThrow(/must stay a frame or a group/u);
	});

	it("adds an asset from base64", async () => {
		const workspace = new Workspace(Tab.untitled());
		const result = await call(workspace, "add_asset", { base64: btoa("png"), type: "image/png" });
		expect(JSON.stringify(result)).toMatch(/^\{"asset":"[0-9a-f]{64}"\}$/u);
	});

	it("lists the open documents and runs a tool on a named one", async () => {
		const first = Tab.untitled();
		const workspace = new Workspace(first);
		workspace.add(Tab.untitled());
		const documents = await call(workspace, "list_documents");
		expect(documents).toMatchObject([{ id: first.id, active: false }, { active: true }]);
		const outline = await call(workspace, "get_outline", { document: first.id });
		expect(outline).toHaveLength(1);
	});

	it("gives an error for a bad call", async () => {
		const workspace = new Workspace(Tab.untitled());
		expect(await runTool(workspace, { id: 3, tool: "get_layer", args: { id: "nope" } })).toEqual({
			id: 3,
			ok: false,
			error: 'No layer has the id "nope".',
		});
		expect(await runTool(workspace, "junk")).toMatchObject({ id: -1, ok: false });
	});
});

describe("export tools", () => {
	it("refuses to render on the website, and a bad scale", async () => {
		vi.stubGlobal("window", {});
		const workspace = new Workspace(Tab.untitled());
		const id = firstLayer(workspace);
		await expect(call(workspace, "render", { id })).rejects.toThrow(/needs the desktop app/u);
		await expect(call(workspace, "render", { id, scale: 9 })).rejects.toThrow(/scale/u);
	});

	it("refuses an export in an unknown format, and on the website", async () => {
		vi.stubGlobal("window", {});
		const workspace = new Workspace(Tab.untitled());
		const id = firstLayer(workspace);
		await expect(call(workspace, "export_layer", { id, format: "gif" })).rejects.toThrow(
			/png, jpg, svg, pdf, html, zip/u,
		);
		await expect(call(workspace, "export_layer", { id, format: "pdf" })).rejects.toThrow(
			/needs the desktop app/u,
		);
	});
});

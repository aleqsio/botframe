import { describe, expect, it } from "vitest";
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

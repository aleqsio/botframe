export const AGENT_PORT = 7341;
export const AGENT_HOST = "127.0.0.1";
export const AGENT_PAGE_PATH = "/page";
export const AGENT_MCP_PATH = "/mcp";

export const AGENT_CALL = "agent:call";
export const AGENT_REPLY = "agent:reply";

export interface AgentCall {
	id: number;
	tool: string;
	args: unknown;
}

export type AgentReply =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: string };

export interface AgentTool {
	name: string;
	description: string;
	inputSchema: Readonly<Record<string, unknown>>;
}

const DOCUMENT = {
	type: "string",
	description: "The id of an open document from list_documents. The default is the active tab.",
};

const LAYER_ID = { type: "string", description: "A layer id, for example 12@3 or 4@1~9@3." };

const PARENT = {
	type: ["string", "null"],
	description: "The id of the parent layer. null puts the layer on the canvas root.",
};

const DATA_PATH = {
	type: "array",
	items: { type: ["string", "integer"] },
	description:
		"Keys from a root container. Roots: layers (the layer tree; the next key is a node id, then the keys of its data), components, sources, scope (document variables), assets. Map keys are strings. List items are indexes.",
};

const LAYER_SHAPE =
	"Layer fields: x, y, width, height (pixels), fill (CSS color), name, clip (boolean), geometry ({kind: rectangle, cornerRadius, cornerSmoothing, frame} | {kind: ellipse} | {kind: path, vertices}), rotation, skewX, skewY, mirrored, origin {x, y} (0 to 1), lengths {x|y|width|height: {value, unit: px|rem|%|vw|vh}}, layout (width|height: fixed|hug|fill, position: default|offset|absolute, display: block|row|column|grid, wrap, distribute, align, gap, padding, margin, tracks, cell, turnedBox), guides [{axis, at}], media {asset, fit: cover|contain|stretch|tile} | null, content {kind: component, component, props} | {kind: none}, bindings {field: {var: variableId} | condition | null}, clipLayer (layer id) | null.";

function tool(
	name: string,
	description: string,
	properties: Readonly<Record<string, unknown>>,
	required: readonly string[],
): AgentTool {
	return {
		name,
		description,
		inputSchema: { type: "object", properties: { document: DOCUMENT, ...properties }, required },
	};
}

export const AGENT_TOOLS: readonly AgentTool[] = [
	tool("list_documents", "Lists the open documents (tabs) and marks the active one.", {}, []),
	tool(
		"get_outline",
		"Gives the layer tree of the canvas: id, name, kind, component, and children of each layer. A copy of a layer component shows its layers with path ids (copy~node).",
		{},
		[],
	),
	tool(
		"get_layer",
		"Gives all the fields of one layer, with each variable resolved, and the names of the changed fields of a component copy.",
		{ id: LAYER_ID },
		["id"],
	),
	tool(
		"list_components",
		"Gives the components (layer and HTML) and the variables of the document and of each component.",
		{},
		[],
	),
	tool(
		"read_data",
		'Reads the raw CRDT data at a path. A map shows as {"$map": {...}}, a list as {"$list": [...]}, the tree as {"$tree": [{id, data, children}]}, and bytes as {"$bytes": length}. Other values are plain JSON. An empty path reads the full document.',
		{ path: DATA_PATH },
		["path"],
	),
	tool(
		"create_layers",
		`Creates layers, with their children, and gives the new ids. ${LAYER_SHAPE} Each layer can have children: [layers].`,
		{
			parent: PARENT,
			index: { type: "integer", description: "The position among the siblings." },
			layers: { type: "array", items: { type: "object" } },
		},
		["parent", "layers"],
	),
	tool(
		"update_layer",
		`Changes the fields of one layer. Give only the fields to change. Objects merge into the held value; arrays replace it. ${LAYER_SHAPE}`,
		{ id: LAYER_ID, change: { type: "object" } },
		["id", "change"],
	),
	tool(
		"delete_layers",
		"Deletes layers and their children.",
		{ ids: { type: "array", items: LAYER_ID } },
		["ids"],
	),
	tool(
		"move_layer",
		"Moves a layer to a different parent or position.",
		{ id: LAYER_ID, parent: PARENT, index: { type: "integer" } },
		["id", "parent"],
	),
	tool(
		"make_component",
		"Makes a layer component from a frame layer, and gives the component id.",
		{ id: LAYER_ID },
		["id"],
	),
	tool(
		"detach_component",
		"Changes a copy of a layer component into plain layers.",
		{ id: LAYER_ID },
		["id"],
	),
	tool(
		"set_variable",
		"Adds a variable or changes it. With no id, it adds a variable and gives the id.",
		{
			owner: {
				type: "string",
				description: "document, or a component id. The default is document.",
			},
			id: { type: "string" },
			name: { type: "string" },
			type: { enum: ["color", "length", "number", "text", "boolean", "choice"] },
			initial: { description: "A literal, {var: id}, or {when: [{test, is, result}], else}." },
			options: { type: "array", items: { type: "string" }, description: "For a choice." },
		},
		["name", "type", "initial"],
	),
	tool(
		"delete_variable",
		"Deletes a variable.",
		{ owner: { type: "string" }, id: { type: "string" } },
		["id"],
	),
	tool(
		"write_data",
		'Writes a raw CRDT value at a path. A plain JSON value replaces the value at the path. {"$map": {...}} merges keys into a map and makes the map if necessary. {"$list": [...]} replaces the items of a list. The model ignores a value that it cannot read. Use this for each change that the other tools do not give.',
		{ path: DATA_PATH, value: {} },
		["path", "value"],
	),
	tool("delete_data", "Deletes the raw CRDT value at a path.", { path: DATA_PATH }, ["path"]),
	tool(
		"add_asset",
		"Adds an image or a video to the asset store and gives its asset id. Put the id in the media field of a layer.",
		{
			base64: { type: "string" },
			type: { type: "string", description: "The media type, for example image/png." },
		},
		["base64", "type"],
	),
	tool("undo", "Undoes the last change of this editor.", {}, []),
	tool("redo", "Redoes the last undone change.", {}, []),
];

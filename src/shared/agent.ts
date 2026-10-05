export const AGENT_PORT = 7341;
export const AGENT_HOST = "127.0.0.1";
export const AGENT_PAGE_PATH = "/page";
export const AGENT_MCP_PATH = "/mcp";
export const AGENT_MCP_URL = `http://${AGENT_HOST}:${AGENT_PORT}${AGENT_MCP_PATH}`;
export const AGENT_ADD_COMMAND = `claude mcp add --transport http botframe ${AGENT_MCP_URL}`;
export const AGENT_RELAY_COMMAND = "bun run agent";

export const RENDER_LONG_SIDE = 2048;

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

export interface AgentImage {
	type: "image";
	data: string;
	mimeType: "image/png";
}

export interface AgentResource {
	type: "resource";
	resource:
		| { uri: string; mimeType: string; text: string }
		| { uri: string; mimeType: string; blob: string };
}

export interface AgentTool {
	name: string;
	description: string;
	inputSchema: Readonly<Record<string, unknown>>;
}

const DOCUMENT = {
	type: "string",
	description: "The id of an open document from list_documents. The default is the active tab.",
};

const LAYER_ID = {
	type: "string",
	description:
		"A layer id from get_outline. A node id is <counter>@<peer>, for example 77@4341970031908957027. A layer inside a component copy has a path id: the copy id, ~, and the node id, for example 12@4341970031908957027~5@4341970031908957027.",
};

const PARENT = {
	type: ["string", "null"],
	description:
		"The id of the parent layer: a frame or a group, as in the editor. A plain rectangle, an ellipse, or a path cannot hold layers. null puts the layer on the canvas root.",
};

const DATA_PATH = {
	type: "array",
	items: { type: ["string", "integer"] },
	description:
		"Keys from a root container. Roots: layers (the layer tree; the next key is a node id, then the keys of its data), components, sources, scope (document variables), assets. Map keys are strings. List items are indexes.",
};

const LAYOUT_GUIDE =
	"Build a design as nested frames, as in HTML with flexbox. A frame is geometry {kind: rectangle, frame: true}; a plain rectangle is a shape, not a container. Give a container frame layout {display: column or row, gap, padding, align, distribute} and let its children flow, with layout.width or layout.height set to hug (fit the content) or fill (take the free space). x and y are pixels from the top-left corner of the parent. On the canvas root and in a display: block parent, each child is placed at its x and y. In a row, column, or grid parent, a child with position: default is placed by the parent layout and its x and y have no effect; position: offset moves it by x and y from that place; position: absolute takes it out of the flow and places it at x and y. A layer with children and no geometry becomes a frame.";

const PROPS_GUIDE =
	"content.props sets the props of a component copy: {propName: value}. Use the prop name or the variable id from list_components. botframe refuses a name that the component does not have.";

const LAYER_SHAPE =
	"Layer fields: x, y, width, height (pixels), fill (CSS color), name, clip (boolean), geometry ({kind: rectangle, cornerRadius, cornerSmoothing, frame} | {kind: ellipse} | {kind: path, vertices} | {kind: group} | {kind: text, content, fontFamily (a Google Fonts family; the editor downloads it into the file), fontWeight, italic, fontSize (px), lineHeight (a factor), letterSpacing (px), textAlign: left|center|right|justify, verticalAlign: top|middle|bottom, decoration: none|underline|line-through, textCase: none|uppercase|lowercase|capitalize}; only a frame or a group holds children; the fill of a text layer paints its glyphs, and layout width and height hug make a text layer fit its text), rotation, skewX, skewY, mirrored, origin {x, y} (0 to 1), lengths {x|y|width|height: {value, unit: px|rem|%|vw|vh}}, layout (width|height: fixed|hug|fill, position: default|offset|absolute, display: block|row|column|grid, wrap, distribute, align, gap, padding, margin, tracks, cell, turnedBox), guides [{axis, at}], media {asset, fit: cover|contain|stretch|tile} | null, content {kind: component, component, props} | {kind: none}, bindings {field: {var: variableId} | condition | null; a text layer can also bind content and fontSize}, clipLayer (layer id) | null.";

const HTML_GUIDE =
	"An HTML component is a template, a stylesheet, and props. The html uses {{prop}} for the text of a prop, {{#prop}}...{{/prop}} for a part that shows when the prop is true or not empty, and {{^prop}}...{{/prop}} for a part that shows when it is false or empty. The css applies inside the component only. Each prop is {name, kind: text, initial: string} | {name, kind: boolean, initial: true|false} | {name, kind: choice, initial, options: [string]}. A prop name starts with a letter or _ and has only letters, digits, _ and -.";

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
		"render",
		`Gives a PNG picture of one layer as the browser draws it, or of the visible canvas when no id is given. Use it to check a change. The long side of the picture is ${RENDER_LONG_SIDE} px or less. botframe draws it in a hidden window, so the editor does not change. Needs the desktop app.`,
		{
			id: LAYER_ID,
			scale: {
				type: "number",
				description:
					"Pixels in the picture for each pixel of the layer, from 0.1 to 4. The default is 1. With no id, the scale applies to the canvas as it shows.",
			},
		},
		[],
	),
	tool(
		"export_layer",
		`Exports one layer, or the visible canvas when no id is given, as a file: png, jpg, svg (the HTML inside a foreignObject), pdf, html (one page, with fonts and media inline), or zip (index.html, styles.css, and an assets folder). Gives html and svg as text, and the other formats as base64. The scale applies to png and jpg only, and the long side of a picture is ${RENDER_LONG_SIDE} px or less. Needs the desktop app.`,
		{
			id: LAYER_ID,
			format: { enum: ["png", "jpg", "svg", "pdf", "html", "zip"] },
			scale: {
				type: "number",
				description:
					"For png and jpg: pixels for each pixel of the layer, from 0.1 to 4. The default is 1.",
			},
		},
		["format"],
	),
	tool(
		"read_data",
		'Reads the raw CRDT data at a path. A map shows as {"$map": {...}}, a list as {"$list": [...]}, the tree as {"$tree": [{id, data, children}]}, and bytes as {"$bytes": length}. Other values are plain JSON. An empty path reads the full document.',
		{ path: DATA_PATH },
		["path"],
	),
	tool(
		"create_layers",
		`Creates layers, with their children, and gives the new ids. ${LAYER_SHAPE} Each layer can have children: [layers]. ${LAYOUT_GUIDE} ${PROPS_GUIDE}`,
		{
			parent: PARENT,
			index: { type: "integer", description: "The position among the siblings." },
			layers: { type: "array", items: { type: "object" } },
		},
		["parent", "layers"],
	),
	tool(
		"update_layer",
		`Changes the fields of one layer. Give only the fields to change. Objects merge into the held value; arrays replace it. botframe refuses a value that it cannot read, and names it. ${LAYER_SHAPE} ${LAYOUT_GUIDE} ${PROPS_GUIDE}`,
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
		"create_html_component",
		`Adds an HTML component, or changes the HTML component with the same name. It writes the source, the component, and one variable for each prop, and gives the component id. Put a copy on the canvas with create_layers and content {kind: component, component: <id>, props: {propName: value}}. ${HTML_GUIDE}`,
		{
			name: { type: "string" },
			html: { type: "string" },
			css: { type: "string" },
			props: { type: "array", items: { type: "object" } },
		},
		["name", "html"],
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
			initial: {
				type: ["string", "number", "boolean", "object"],
				description:
					"A literal of the type (a text variable keeps its text exactly), {var: id}, or {when: [{test, is, result}], else}.",
			},
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
		`Writes a raw CRDT value at a path. A plain JSON value replaces the value at the path. {"$map": {...}} merges keys into a map and makes the map if necessary. {"$list": [...]} replaces the items of a list. botframe checks each write to components, sources, and layer fields, and refuses a value that it cannot read, with the names of the bad fields. A source is sources/<address> = {name, html, css, props}; a component is components/<id> = {"$map": {name, kind: html, source: <address>, scope: {"$map": {}}}}. Use create_html_component in place of a raw write of a component. ${HTML_GUIDE}`,
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

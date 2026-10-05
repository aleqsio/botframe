export type Fields = Readonly<Record<string, unknown>>;

export interface Step {
	tool: string;
	args: Fields;
	as?: string;
}

export interface Example {
	name: string;
	fonts: readonly string[];
	steps: readonly Step[];
}

export const FRAME = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true };

export function px(value: number): Fields {
	return { value, unit: "px" };
}

export function sides(value: number): Fields {
	return { top: px(value), right: px(value), bottom: px(value), left: px(value) };
}

export function text(content: string, style: Fields = {}): Fields {
	return { kind: "text", content, fontFamily: "Inter", fontSize: 24, ...style };
}

export function root(name: string, size: Fields, children: readonly Fields[]): Step {
	return {
		tool: "create_layers",
		as: "root",
		args: {
			parent: null,
			layers: [{ name, x: 0, y: 0, fill: "#ffffff", geometry: FRAME, ...size, children }],
		},
	};
}

export function child(as: string, layer: Fields, parent = "$root"): Step {
	return { tool: "create_layers", as, args: { parent, layers: [layer] } };
}

export function update(id: string, change: Fields): Step {
	return { tool: "update_layer", args: { id, change } };
}

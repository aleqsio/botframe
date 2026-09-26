import type { ReactElement } from "react";
import { Icon } from "../Icon";
import { copyActions } from "./ComponentActions";
import type { PanelProps } from "./ComponentActions";
import { IconMenu } from "./IconMenu";
import { ApplyMenu, SyncMenu } from "./SyncMenus";

export function InstanceHeader(
	props: PanelProps & { count: number; locked: boolean; name: string | null },
): ReactElement {
	const { count, doc, layer, locked, name } = props;
	const { content } = layer;
	const synced = !locked && content.kind === "component";
	return (
		<>
			<div className="instance-head">
				<span className="group-label">Instance</span>
				{synced ? (
					<>
						<SyncMenu doc={doc} id={layer.id} instance={content.instance} />
						<ApplyMenu doc={doc} id={layer.id} instance={content.instance} />
					</>
				) : null}
			</div>
			<div className="component-title">
				<Icon name="component" />
				<span className="component-name">{name ?? "Missing component"}</span>
				<span className="component-count">{count === 1 ? "1 instance" : `${count} instances`}</span>
				{locked ? null : (
					<IconMenu actions={copyActions(props)} icon="more" label="Component actions" />
				)}
			</div>
		</>
	);
}

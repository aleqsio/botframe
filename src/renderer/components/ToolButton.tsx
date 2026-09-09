import { Toggle } from "@base-ui-components/react/toggle";
import { Toolbar } from "@base-ui-components/react/toolbar";
import type { ReactElement } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function ToolButton({
	icon,
	label,
	onPress,
	pressed,
}: {
	icon: IconName;
	label: string;
	onPress: () => void;
	pressed: boolean;
}): ReactElement {
	return (
		<Toolbar.Button
			aria-label={label}
			className="tool-button"
			render={<Toggle onPressedChange={onPress} pressed={pressed} />}
		>
			<Icon name={icon} />
		</Toolbar.Button>
	);
}

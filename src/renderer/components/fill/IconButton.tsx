import type { ReactElement } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";

export function IconButton({
	disabled = false,
	icon,
	label,
	onClick,
}: {
	disabled?: boolean | undefined;
	icon: IconName;
	label: string;
	onClick: () => void;
}): ReactElement {
	return (
		<button
			aria-label={label}
			className="icon-button"
			disabled={disabled}
			onClick={onClick}
			title={label}
			type="button"
		>
			<Icon name={icon} />
		</button>
	);
}

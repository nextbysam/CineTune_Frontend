import { Toggle } from "@/components/ui/toggle";
import { useEffect, useState } from "react";
import { Square, Check } from "lucide-react";
import useStore from "../../store/use-store";

const Squantre = ({
	value,
	onChange,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
}) => {
	const [localValue, setLocalValue] = useState(value);
	const { size } = useStore(); // Get canvas/composition size

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const handleSquantreToggle = () => {
		const newValue = !localValue;
		setLocalValue(newValue);
		onChange(newValue);
	};

	return (
		<div className="flex gap-2">
			<div className="flex flex-1 items-center text-sm text-muted-foreground">
				Squantre
			</div>
			<Toggle
				pressed={localValue}
				onPressedChange={handleSquantreToggle}
				variant="outline"
				size="sm"
				className="h-8 w-8"
				aria-label="Toggle Squantre mode"
			>
				{localValue ? (
					<Check className="h-4 w-4" />
				) : (
					<Square className="h-4 w-4" />
				)}
			</Toggle>
		</div>
	);
};

export default Squantre;

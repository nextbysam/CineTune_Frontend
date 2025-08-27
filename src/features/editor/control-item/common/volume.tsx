import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const Volume = ({
	value,
	onChange,
	isMuted = false,
	onMuteToggle,
}: {
	value: number;
	onChange: (v: number) => void;
	isMuted?: boolean;
	onMuteToggle?: (muted: boolean) => void;
}) => {
	// Create local state to manage volume
	const [localValue, setLocalValue] = useState(value);
	const [lastUnmutedValue, setLastUnmutedValue] = useState(value > 0 ? value : 100);

	// Update local state when prop value changes
	useEffect(() => {
		setLocalValue(value);
		if (value > 0) {
			setLastUnmutedValue(value);
		}
	}, [value]);

	const handleMuteToggle = () => {
		if (onMuteToggle) {
			const newMutedState = !isMuted;
			onMuteToggle(newMutedState);
			
			if (newMutedState) {
				// Muting: set volume to 0 but remember current value
				setLastUnmutedValue(localValue > 0 ? localValue : 100);
				onChange(0);
			} else {
				// Unmuting: restore previous volume
				onChange(lastUnmutedValue);
			}
		}
	};

	const displayValue = isMuted ? 0 : localValue;

	return (
		<div className="flex gap-2">
			<div className="flex flex-1 items-center text-sm text-muted-foreground">
				Volume
			</div>
			<div className="flex items-center gap-2">
				{onMuteToggle && (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handleMuteToggle}
						title={isMuted ? "Unmute" : "Mute"}
					>
						{isMuted ? (
							<VolumeX className="h-4 w-4" />
						) : (
							<Volume2 className="h-4 w-4" />
						)}
					</Button>
				)}
				<div
					className="w-32"
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 80px",
					}}
				>
					<Input
						className="h-8 w-11 px-2 text-center text-sm"
						type="number"
						disabled={isMuted}
						onChange={(e) => {
							const newValue = Number(e.target.value);
							if (newValue >= 0 && newValue <= 100) {
								setLocalValue(newValue);
								if (!isMuted) {
									onChange(newValue);
								}
							}
						}}
						value={displayValue}
					/>
					<Slider
						id="volume"
						value={[displayValue]}
						disabled={isMuted}
						onValueChange={(e) => {
							setLocalValue(e[0]);
						}}
						onValueCommit={() => {
							if (!isMuted) {
								onChange(localValue);
							}
						}}
						max={100}
						step={1}
						aria-label="Volume"
					/>
				</div>
			</div>
		</div>
	);
};

export default Volume;

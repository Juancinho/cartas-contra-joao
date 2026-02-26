import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

interface WhiteCardProps {
  text: string;
  selected?: boolean;
  selectionOrder?: number; // show order number when multiple picks
  onClick?: () => void;
  disabled?: boolean;
  revealed?: boolean; // for reveal phase animation
  winner?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function WhiteCard({
  text,
  selected,
  selectionOrder,
  onClick,
  disabled,
  winner,
  className,
  size = "md",
}: WhiteCardProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "card-white relative flex flex-col justify-between",
        size === "sm" && "p-3 rounded-xl text-sm min-h-[80px]",
        size === "md" && "p-4 rounded-2xl text-sm min-h-[100px]",
        selected && "selected",
        winner && "ring-4 ring-yellow-400 border-yellow-400",
        disabled && "opacity-60 cursor-not-allowed pointer-events-none",
        onClick && !disabled && "cursor-pointer hover:border-zinc-400",
        className
      )}
    >
      <p className="font-semibold leading-snug text-black flex-1">{text}</p>
      {selected && (
        <div className="absolute top-2 right-2">
          {selectionOrder !== undefined ? (
            <span className="bg-black text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
              {selectionOrder}
            </span>
          ) : (
            <span className="bg-black text-white rounded-full p-0.5">
              <Check size={12} />
            </span>
          )}
        </div>
      )}
      {winner && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full">
          ★ WIN
        </div>
      )}
    </div>
  );
}

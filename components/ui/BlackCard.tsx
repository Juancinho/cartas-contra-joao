import { cn } from "@/lib/cn";
import type { BlackCard as BlackCardType } from "@/lib/types";

interface BlackCardProps {
  card: BlackCardType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BlackCard({ card, className, size = "md" }: BlackCardProps) {
  const textWithBlanks = card.text.replace(/_/g, "______");

  return (
    <div
      className={cn(
        "card-black relative flex flex-col justify-between",
        size === "sm" && "p-3 rounded-xl text-sm min-h-[100px]",
        size === "md" && "p-5 rounded-2xl text-base min-h-[140px]",
        size === "lg" && "p-6 rounded-2xl text-lg min-h-[180px]",
        className
      )}
    >
      <p
        className={cn(
          "font-bold leading-snug",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl",
        )}
        dangerouslySetInnerHTML={{ __html: textWithBlanks }}
      />
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
          Cartas contra Joao
        </span>
        {card.pick > 1 && (
          <span className="text-xs font-bold bg-white text-black px-2 py-0.5 rounded-full">
            Elige {card.pick}
          </span>
        )}
      </div>
    </div>
  );
}

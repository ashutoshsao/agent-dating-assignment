import { cn } from "@/lib/utils";

/** Generated avatar — real profile photos are never used. */
export function Avatar({ seed, name, className }: { seed: string; name: string; className?: string }) {
  return (
    <img
      src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=efe0d3,e3dccb,d9e4dc,dfe0ec`}
      alt={`Generated avatar for ${name}`}
      className={cn("size-12 shrink-0 rounded-full bg-muted", className)}
      loading="lazy"
    />
  );
}

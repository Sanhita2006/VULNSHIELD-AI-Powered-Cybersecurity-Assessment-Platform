import { Link } from "@tanstack/react-router";
import { Globe, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataMode } from "@/hooks/use-data-mode";

/** Live mode with no real scans: show nothing invented, only next actions. */
export function EmptyScans() {
  const { setMode } = useDataMode();
  return (
    <div className="panel corner-brackets scanline flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full border border-primary/50 bg-primary/10 text-primary glow">
        <ShieldQuestion className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-foreground">No real scan results yet</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Live mode shows only results from scans you actually run. Score, severity counts and the activity log
        stay empty until then — nothing is estimated.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="neon">
          <Link to="/website-audit">
            <Globe /> Start a website audit
          </Link>
        </Button>
        <Button variant="terminal" onClick={() => setMode("demo")}>
          View demo data
        </Button>
      </div>
    </div>
  );
}

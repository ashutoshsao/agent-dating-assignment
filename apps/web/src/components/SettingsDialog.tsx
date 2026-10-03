import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS, getSettings, hasKey, saveSettings, type LlmSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [keySet, setKeySet] = useState(hasKey);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setReason((e as CustomEvent<string | undefined>).detail);
      setOpen(true);
    };
    const onChange = () => setKeySet(hasKey());
    window.addEventListener("proxy:open-settings", onOpen);
    window.addEventListener("proxy:settings-changed", onChange);
    return () => {
      window.removeEventListener("proxy:open-settings", onOpen);
      window.removeEventListener("proxy:settings-changed", onChange);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setReason(undefined);
          setOpen(true);
        }}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-150",
          keySet ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        <KeyRound className="size-4" />
        <span className="hidden sm:inline">{keySet ? "Your key" : "Add your API key"}</span>
      </button>
      <SettingsDialog open={open} onOpenChange={setOpen} reason={reason} />
    </>
  );
}

function SettingsDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string }) {
  const [s, setS] = useState<LlmSettings>(getSettings);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (open) setS(getSettings());
  }, [open]);

  const save = async () => {
    saveSettings(s);
    if (!s.apiKey.trim()) return onOpenChange(false);
    setChecking(true);
    try {
      await api("/api/llm/check", { method: "POST" });
      toast.success("Key works — you're ready to create agents");
      onOpenChange(false);
    } catch {
      toast.error("That key didn't work with this base URL and model.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-normal">Bring your own key</DialogTitle>
          <DialogDescription>
            {reason ? `${reason} ` : ""}Browsing the demo is free. Creating agents and sending them on dates runs on your own LLM key — it stays in this browser and is sent only with your requests, never stored on our server.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="apiKey">API key</Label>
            <Input id="apiKey" type="password" autoComplete="off" placeholder="sk-…" value={s.apiKey} onChange={(e) => setS({ ...s, apiKey: e.target.value })} />
            <p className="text-xs text-muted-foreground">DeepSeek by default. Any OpenAI-compatible Chat Completions API works.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input id="baseURL" value={s.baseURL} onChange={(e) => setS({ ...s, baseURL: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                saveSettings(null);
                setS(DEFAULT_SETTINGS);
              }}
            >
              Forget key
            </Button>
            <Button type="submit" className="rounded-full" disabled={checking}>
              {checking && <Loader2 className="size-4 animate-spin" />} Save & test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

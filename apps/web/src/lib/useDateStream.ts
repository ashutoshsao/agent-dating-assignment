import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DateDTO, DateEvent } from "@dating/shared";
import { API_URL } from "./api";

/** Merges live SSE events into the cached DateDTO; returns who is currently "typing". */
export function useDateStream(id: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const [typing, setTyping] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!id || !enabled) return;
    const es = new EventSource(`${API_URL}/api/dates/${id}/stream`);
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data) as DateEvent;
      if (e.type === "typing") return setTyping(e.speakerId);
      qc.setQueryData<DateDTO>(["date", id], (d) => {
        if (!d) return d;
        switch (e.type) {
          case "status":
            return e.status === "live" ? { ...d, status: "live", turns: [], debriefs: [], mutual: null, venue: null } : { ...d, status: e.status };
          case "venue":
            return { ...d, venue: e.venue };
          case "turn":
            setTyping(undefined);
            return { ...d, turns: [...(d.turns ?? []).filter((t) => t.idx !== e.turn.idx), e.turn] };
          case "debrief":
            setTyping(undefined);
            return { ...d, debriefs: [...(d.debriefs ?? []).filter((x) => x.personId !== e.debrief.personId), e.debrief] };
          case "done":
            return { ...d, status: "done", mutual: e.mutual };
          case "error":
            return { ...d, status: "error" };
        }
      });
      if (e.type === "done" || e.type === "error") qc.invalidateQueries({ queryKey: ["dates"] });
    };
    return () => es.close();
  }, [id, enabled, qc]);

  return typing;
}

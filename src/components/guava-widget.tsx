"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  webrtcCode: string;
  name: string;
  color: string;
};

export function GuavaWidget({ webrtcCode, name, color }: Props) {
  const mounted = useRef(false);
  const [expertOk, setExpertOk] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/expert/health")
      .then((r) => r.json())
      .then((data) => setExpertOk(Boolean(data.ok)))
      .catch(() => setExpertOk(false));
  }, []);

  useEffect(() => {
    if (!webrtcCode.startsWith("grtc-") || mounted.current) return;
    mounted.current = true;
    const script = document.createElement("script");
    script.src = "https://app.goguava.ai/static/build/webrtc-widgets/guava-widget.js";
    script.setAttribute("webrtc-code", webrtcCode);
    script.setAttribute("gw-name", name);
    script.setAttribute("gw-color", color);
    script.setAttribute("enable-chat", "");
    document.body.appendChild(script);
  }, [webrtcCode, name, color]);

  if (!webrtcCode.startsWith("grtc-")) {
    return (
      <p className="text-sm text-muted-foreground">
        Waiting for the Python Expert to mint a Guava WebRTC code. Keep{" "}
        <span className="font-mono">python expert/main.py</span> running.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {expertOk === false ? (
        <p className="text-sm text-destructive">
          Expert is not reachable on :18766. Start{" "}
          <span className="font-mono">python expert/main.py</span>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Use the Guava orb (bottom-right). Live audio, not a script.{" "}
          <span className="font-mono text-xs">{webrtcCode}</span>
        </p>
      )}
    </div>
  );
}

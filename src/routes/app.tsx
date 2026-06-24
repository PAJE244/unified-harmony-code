import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PlatformApp from "@/components/PlatformApp";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "SCRIPTANDO — Acesso à Plataforma" },
      { name: "description", content: "Acesse sua biblioteca premium de scripts SCRIPTANDO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  // PlatformApp uses window/localStorage on mount; render client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-xs font-mono tracking-widest uppercase">
        Carregando SCRIPTANDO...
      </div>
    );
  }
  return <PlatformApp />;
}

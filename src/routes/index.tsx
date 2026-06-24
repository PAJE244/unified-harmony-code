import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCRIPTANDO — Plataforma Premium de Scripts por Pajé 01" },
      { name: "description", content: "Automatize Khan Academy, Quizizz, Redação PR, Inglês PR e Leia PR. Acesso vitalício por R$9,90." },
      { property: "og:title", content: "SCRIPTANDO — Automação Escolar Premium" },
      { property: "og:description", content: "A plataforma premium de scripts do Pajé. Acesso vitalício por R$9,90." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

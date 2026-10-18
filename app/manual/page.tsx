import type { Metadata } from "next";
import { ManualClient } from "./ManualClient";
import "./manual.css";

export const metadata: Metadata = {
  title: "Manual das aulas | Método Gênio",
  description: "Passo a passo de cada aula do Método Gênio, com checklist para acompanhar o seu avanço.",
};

export default function ManualPage() {
  return <ManualClient />;
}

import React from "react";
import { useSearchParams } from "react-router-dom";
import { MonthlyPage } from "@/features/roster/monthly/MonthlyPage";

export default function RosterSummary() {
  const [params] = useSearchParams();
  const siteName = params.get("site") || undefined;

  return (
    <MonthlyPage siteName={siteName} />
  );
}
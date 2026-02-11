"use client"

import { useState } from "react"
import { AppShell, type ActiveView } from "@/components/app-shell"
import { DecisionSimulator } from "@/components/simulator/decision-simulator"
import { DecisionHistory } from "@/components/history/decision-history"
import { CognitiveGym } from "@/components/gym/cognitive-gym"

export default function Page() {
  const [activeView, setActiveView] = useState<ActiveView>("simulator")

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === "simulator" && <DecisionSimulator />}
      {activeView === "history" && <DecisionHistory />}
      {activeView === "gym" && <CognitiveGym />}
    </AppShell>
  )
}

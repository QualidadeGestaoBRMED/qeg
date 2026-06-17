import type React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "person" | "talentos";

interface MonitorTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  children: {
    person: React.ReactNode;
    talentos: React.ReactNode;
  };
}

export function MonitorTabs({ activeTab, onChange, children }: MonitorTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onChange(value as TabKey)}
    >
      <TabsList>
        <TabsTrigger value="person">Por pessoa</TabsTrigger>
        <TabsTrigger value="talentos">Talentos</TabsTrigger>
      </TabsList>
      <TabsContent value="person">{children.person}</TabsContent>
      <TabsContent value="talentos">{children.talentos}</TabsContent>
    </Tabs>
  );
}

import type React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MonitorTabsProps {
  activeTab: "person" | "area" | "load";
  onChange: (tab: "person" | "area" | "load") => void;
  children: {
    person: React.ReactNode;
    area: React.ReactNode;
    load: React.ReactNode;
  };
}

export function MonitorTabs({ activeTab, onChange, children }: MonitorTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onChange(value as MonitorTabsProps["activeTab"])}
    >
      <TabsList>
        <TabsTrigger value="person">Por pessoa</TabsTrigger>
        <TabsTrigger value="area">Por area</TabsTrigger>
        <TabsTrigger value="load">Carga da equipe</TabsTrigger>
      </TabsList>
      <TabsContent value="person">{children.person}</TabsContent>
      <TabsContent value="area">{children.area}</TabsContent>
      <TabsContent value="load">{children.load}</TabsContent>
    </Tabs>
  );
}

import type React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "person" | "skills";

interface MonitorTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  children: {
    person: React.ReactNode;
    skills: React.ReactNode;
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
        <TabsTrigger value="skills">Skills</TabsTrigger>
      </TabsList>
      <TabsContent value="person">{children.person}</TabsContent>
      <TabsContent value="skills">{children.skills}</TabsContent>
    </Tabs>
  );
}

import { AssigneeLane } from "./AssigneeLane";
import type { AssigneeGroup } from "../types";

interface AssigneeBoardProps {
  groups: AssigneeGroup[];
  isLoading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-[#E0DED8] bg-white px-4 py-4"
        >
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#EFEEE9]" />
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-[#EFEEE9]" />
                <div className="h-4 w-20 animate-pulse rounded bg-[#EFEEE9]" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="h-14 w-40 animate-pulse rounded-md bg-[#EFEEE9]" />
                <div className="h-14 w-32 animate-pulse rounded-md bg-[#EFEEE9]" />
              </div>
              <div className="h-9 w-36 animate-pulse rounded-md bg-[#EFEEE9]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssigneeBoard({ groups, isLoading }: AssigneeBoardProps) {
  if (isLoading && groups.length === 0) {
    return <LoadingSkeleton />;
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#E0DED8] bg-white px-6 py-12 text-center text-sm text-[#6B6A65]">
        Nenhum card foi encontrado nas fases configuradas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <AssigneeLane key={group.name} group={group} />
      ))}
    </div>
  );
}

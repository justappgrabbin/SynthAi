import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditTimeline } from "@/components/audit-timeline";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  ScrollText, 
  Filter, 
  Calendar as CalendarIcon,
  Download
} from "lucide-react";
import type { AuditLog } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Audit() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const filteredLogs = logs?.filter((log) => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (!log.action.toLowerCase().includes(searchLower) &&
          !log.actor.toLowerCase().includes(searchLower) &&
          !(log.glyphId?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (actorFilter !== "all" && log.actor !== actorFilter) return false;
    if (dateRange.from) {
      const logDate = new Date(log.at);
      if (logDate < dateRange.from) return false;
      if (dateRange.to && logDate > dateRange.to) return false;
    }
    return true;
  });

  const uniqueActors = [...new Set(logs?.map(l => l.actor) || [])];
  const uniqueActions = [...new Set(logs?.map(l => l.action) || [])];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline font-semibold">Audit Log</h1>
          <p className="text-body text-muted-foreground mt-1">
            Complete history of all glyph lifecycle events
          </p>
        </div>
        <Button variant="outline" data-testid="button-export-audit">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, actor, or glyph ID..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-audit"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-action-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      <span className="capitalize">{action}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-actor-filter">
                  <SelectValue placeholder="Actor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  {uniqueActors.map(actor => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                    data-testid="button-date-filter"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 pl-10">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <AuditTimeline logs={filteredLogs} />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">No audit entries found</p>
              <p className="text-caption mt-1">
                {search || actionFilter !== "all" || actorFilter !== "all" || dateRange.from
                  ? "Try adjusting your filters"
                  : "Events will appear here as actions are performed"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

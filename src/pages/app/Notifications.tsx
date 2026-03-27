import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/lib/magic-ui";
import { Card } from "@/components/ui/card";
import { Bell, CheckCheck, Clock3, ShieldAlert, Sparkles } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationService } from "@/services/notificationService";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "system" | "case" | "agent";
  unread: boolean;
}

export default function Notifications() {
  const [mode] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const [filter, setFilter] = useState<"all" | "unread" | "system" | "case" | "agent">("all");
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    notificationService
      .list()
      .then((rows) => {
        setItems(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            message: r.body,
            time: new Date(r.created_at).toLocaleString(),
            type: (() => {
              const t = r.title.toLowerCase();
              if (t.includes("document")) return "case";
              if (
                t.includes("run") ||
                t.includes("query parsing") ||
                t.includes("contract risk") ||
                t.includes("outcome prediction") ||
                t.includes("policy compliance") ||
                t.includes("legal draft") ||
                t.includes("completed") ||
                t.includes("failed")
              ) return "agent";
              return "system";
            })(),
            unread: !r.read_at,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const unreadCount = items.filter((n) => n.unread).length;

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => n.unread);
    return items.filter((n) => n.type === filter);
  }, [filter, items]);

  const markAllAsRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    window.dispatchEvent(new CustomEvent("notifications:updated"));
    void notificationService.markAllRead().catch(() => undefined);
  };

  const markOneAsRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    window.dispatchEvent(new CustomEvent("notifications:updated"));
    void notificationService.markRead(id).catch(() => undefined);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 md:space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <FadeIn>
        <Card className="p-5 md:p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Notifications</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  Real-time updates for deadlines, agent runs, and compliance changes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs md:text-sm">{items.length} total</Badge>
              <Badge className="text-xs md:text-sm">{unreadCount} unread</Badge>
            </div>
          </div>
        </Card>
      </FadeIn>

      {mode === "loading" ? <LoadingState title="Loading notifications" description="Syncing latest events." /> : null}
      {mode === "error" ? <ErrorState title="Unable to load notifications" description="Please retry shortly." /> : null}
      {mode === "empty" ? <EmptyState title="No notifications" description="You're fully caught up." /> : null}

      {mode === "ready" ? (
        <>
          <FadeIn delay={0.05}>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="w-full grid grid-cols-5 h-auto gap-1 p-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="case">Cases</TabsTrigger>
                <TabsTrigger value="agent">Agents</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
            </Tabs>
          </FadeIn>

          {filtered.length === 0 ? (
            <EmptyState title="No notifications in this filter" description="Try another filter to view updates." />
          ) : (
            <FadeIn delay={0.1}>
              <div className="space-y-3">
                {filtered.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 md:p-5 transition-colors ${item.unread ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <p className="font-semibold text-sm md:text-base">{item.title}</p>
                          {item.unread ? <Badge className="text-[10px]">New</Badge> : null}
                          <Badge variant="outline" className="text-[10px] uppercase">{item.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {item.time}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        {item.type === "case" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : null}
                        {item.type === "agent" ? <Sparkles className="h-4 w-4 text-primary" /> : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          disabled={!item.unread}
                          onClick={() => markOneAsRead(item.id)}
                        >
                          Mark read
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </FadeIn>
          )}
        </>
      ) : null}
    </div>
  );
}

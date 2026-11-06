import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldHalf } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-1 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/60 bg-primary/10 text-primary glow">
            <ShieldHalf className="size-4.5" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-[0.18em] text-primary text-glow">
                VULNSHIELD
              </span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                security ops v0.1
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
              {"// "}
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "group/nav relative font-medium transition-all",
                          active &&
                            "border border-primary/40 bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--shadow-glow)]",
                        )}
                      >
                        <Link to={item.to}>
                          <item.icon className={cn(active && "text-primary")} />
                          <span className="flex-1">{item.label}</span>
                          <span className="font-mono text-[10px] text-muted-foreground group-hover/nav:text-primary">
                            {item.code}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="rounded-md border border-sidebar-border bg-terminal p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse-glow" />
              PASSIVE MODE
            </div>
            <p className="mt-1">Scan only assets you own or are authorised to test.</p>
          </div>
        ) : (
          <span className="mx-auto size-2 rounded-full bg-primary animate-pulse-glow" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

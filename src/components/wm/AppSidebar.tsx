import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, FileStack, GitBranch, LayoutDashboard, Layers, ScrollText, Settings } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { useConnection } from "@/lib/wiremock/hooks";
import { useSettings } from "@/lib/wiremock/settings";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Mappings", url: "/mappings", icon: FileStack },
  { title: "Fallback Rules", url: "/fallback", icon: Layers },
  { title: "Scenarios", url: "/scenarios", icon: GitBranch },
  { title: "Request Journal", url: "/journal", icon: ScrollText },
] as const;

const STATE_LABEL = {
  connected: { label: "Conectado", dot: "bg-success" },
  demo: { label: "Modo demo", dot: "bg-primary" },
  checking: { label: "Verificando…", dot: "bg-muted-foreground animate-pulse" },
  disconnected: { label: "Desconectado", dot: "bg-muted-foreground" },
  "auth-error": { label: "Erro de autenticação", dot: "bg-warning" },
  "network-error": { label: "Erro de comunicação", dot: "bg-destructive" },
} as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const settings = useSettings();
  const conn = useConnection();
  const st = STATE_LABEL[conn.state];

  const isActive = (url: string, exact?: boolean) => (exact ? path === url : path === url || path.startsWith(url + "/"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-[13px] font-semibold">WireMock Manager</p>
              <p className="font-mono text-[10px] text-muted-foreground">admin console</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Instância</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, "exact" in item ? item.exact : false)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <Link to="/settings" className={cn("block rounded-md px-2 py-1.5 hover:bg-sidebar-accent", collapsed && "px-0")} title={`${st.label} · ${settings.baseUrl}`}>
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", st.dot)} />
            {!collapsed && <span className="text-xs font-medium">{st.label}</span>}
          </div>
          {!collapsed && (
            <>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{settings.mode === "demo" ? "dados de demonstração" : settings.baseUrl}</p>
              <p className="font-mono text-[10px] text-muted-foreground">WireMock {conn.version ?? "versão n/d"}</p>
            </>
          )}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

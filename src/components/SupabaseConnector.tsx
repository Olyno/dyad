import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { IpcClient } from "@/ipc/ipc_client";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { useSupabase } from "@/hooks/useSupabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadApp } from "@/hooks/useLoadApp";
import { useDeepLink } from "@/contexts/DeepLinkContext";

// @ts-ignore
import supabaseLogoLight from "../../assets/supabase/supabase-logo-wordmark--light.svg";
// @ts-ignore
import supabaseLogoDark from "../../assets/supabase/supabase-logo-wordmark--dark.svg";
// @ts-ignore
import connectSupabaseDark from "../../assets/supabase/connect-supabase-dark.svg";
// @ts-ignore
import connectSupabaseLight from "../../assets/supabase/connect-supabase-light.svg";

import { ExternalLink } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function SupabaseConnector({ appId }: { appId: number }) {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { app, refreshApp } = useLoadApp(appId);
  const { lastDeepLink } = useDeepLink();
  const { isDarkMode } = useTheme();
  useEffect(() => {
    const handleDeepLink = async () => {
      if (lastDeepLink?.type === "supabase-oauth-return") {
        await refreshSettings();
        await refreshApp();
      }
    };
    handleDeepLink();
  }, [lastDeepLink]);
  const {
    projects,
    loading,
    error,
    loadProjects,
    setAppProject,
    unsetAppProject,
  } = useSupabase();
  const currentProjectId = app?.supabaseProjectId;

  const [localUrl, setLocalUrl] = useState(settings?.supabase?.localUrl || "");
  const [localAnonKey, setLocalAnonKey] = useState(
    settings?.supabase?.localAnonKey || "",
  );

  useEffect(() => {
    // Load projects when the component mounts and user is connected
    if (settings?.supabase?.accessToken) {
      loadProjects();
    }
  }, [settings?.supabase?.accessToken, loadProjects]);

  const handleProjectSelect = async (projectId: string) => {
    try {
      await setAppProject(projectId, appId);
      toast.success("Project connected to app successfully");
      await refreshApp();
    } catch (error) {
      toast.error("Failed to connect project to app: " + error);
    }
  };

  const handleUnsetProject = async () => {
    try {
      await unsetAppProject(appId);
      toast.success("Project disconnected from app successfully");
      await refreshApp();
      await updateSettings({
        supabase: {
          ...settings?.supabase,
          localUrl: undefined,
          localAnonKey: undefined,
        },
      });
      await refreshSettings();
    } catch (error) {
      console.error("Failed to disconnect project:", error);
      toast.error("Failed to disconnect project from app");
    }
  };

  const handleLocalConnect = async () => {
    try {
      const healthUrl = `${localUrl.replace(/\/$/, "")}/auth/v1/health`;
      const res = await fetch(healthUrl);
      if (!res.ok) {
        throw new Error(`Supabase not reachable at ${healthUrl}`);
      }

      await updateSettings({
        supabase: {
          ...settings?.supabase,
          localUrl,
          localAnonKey,
        },
      });
      await unsetAppProject(appId);
      toast.success("Connected to local Supabase instance");
      await refreshApp();
      await refreshSettings();
    } catch (error) {
      toast.error("Failed to connect to local Supabase: " + error);
    }
  };

  if (settings?.supabase?.accessToken) {
    if (app?.supabaseProjectName) {
      return (
        <Card className="mt-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Supabase Project{" "}
              <Button
                variant="outline"
                onClick={() => {
                  IpcClient.getInstance().openExternalUrl(
                    `https://supabase.com/dashboard/project/${app.supabaseProjectId}`,
                  );
                }}
                className="ml-2 px-2 py-1"
                style={{ display: "inline-flex", alignItems: "center" }}
                asChild
              >
                <div className="flex items-center gap-2">
                  <img
                    src={isDarkMode ? supabaseLogoDark : supabaseLogoLight}
                    alt="Supabase Logo"
                    style={{ height: 20, width: "auto", marginRight: 4 }}
                  />
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Button>
            </CardTitle>
            <CardDescription>
              This app is connected to project: {app.supabaseProjectName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleUnsetProject}>
              Disconnect Project
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="mt-1">
        <CardHeader>
          <CardTitle>Supabase Projects</CardTitle>
          <CardDescription>
            Select a Supabase project to connect to this app
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-red-500">
              Error loading projects: {error.message}
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => loadProjects()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No projects found in your Supabase account.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="project-select">Project</Label>
                    <Select
                      value={currentProjectId || ""}
                      onValueChange={handleProjectSelect}
                    >
                      <SelectTrigger id="project-select">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name || project.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentProjectId && (
                    <div className="text-sm text-gray-500">
                      This app is connected to project:{" "}
                      {projects.find((p) => p.id === currentProjectId)?.name ||
                        currentProjectId}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (
    !app?.supabaseProjectId &&
    settings?.supabase?.localUrl &&
    settings?.supabase?.localAnonKey
  ) {
    return (
      <Card className="mt-1">
        <CardHeader>
          <CardTitle>Local Supabase</CardTitle>
          <CardDescription>
            Connected to {settings.supabase.localUrl}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleUnsetProject}>
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-1">
      <CardHeader>
        <CardTitle>Supabase</CardTitle>
        <CardDescription>
          Connect a local self-hosted instance or sign in to Supabase Cloud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="supabase-url">Local URL</Label>
          <Input
            id="supabase-url"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="http://localhost:54321"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supabase-key">Local Anon Key</Label>
          <Input
            id="supabase-key"
            value={localAnonKey}
            onChange={(e) => setLocalAnonKey(e.target.value)}
            placeholder="public-anon-key"
          />
        </div>
        <Button
          onClick={handleLocalConnect}
          disabled={!localUrl || !localAnonKey}
        >
          Connect Local Supabase
        </Button>
        <div className="pt-2">
          <img
            onClick={async () => {
              if (settings?.isTestMode) {
                await IpcClient.getInstance().fakeHandleSupabaseConnect({
                  appId,
                  fakeProjectId: "fake-project-id",
                });
              } else {
                await IpcClient.getInstance().openExternalUrl(
                  "https://supabase-oauth.dyad.sh/api/connect-supabase/login",
                );
              }
            }}
            src={isDarkMode ? connectSupabaseDark : connectSupabaseLight}
            alt="Connect to Supabase"
            className="w-full h-10 min-h-8 min-w-20 cursor-pointer"
            data-testid="connect-supabase-button"
          />
        </div>
      </CardContent>
    </Card>
  );
}

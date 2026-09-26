"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { handleRemoveCollaborator } from "@/lib/actions/collaborator";
import {
  handleCreateClientLogin,
  handleResetClientPassword,
} from "@/lib/actions/client-login";
import {
  CreateClientLoginDialog,
  ResetPasswordDialog,
} from "@/components/client-login-dialogs";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireApiSuccess } from "@/lib/api-client";
import { toast } from "sonner";
import { BookText, EllipsisVertical, Loader } from "lucide-react";

type Collaborator = {
  id: number;
  email: string;
};

type AddCollaboratorState = {
  message?: string;
  error?: string;
  errors?: string[];
  data?: Collaborator[];
};

export function Collaborators({
  owner,
  repo,
  branch,
}: {
  owner: string;
  repo: string;
  branch?: string;
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [addCollaboratorState, addCollaboratorAction] = useActionState<
    AddCollaboratorState,
    FormData
  >(handleCreateClientLogin, {});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<number[]>([]);
  const [resending, setResending] = useState<number[]>([]);
  const [resetId, setResetId] = useState<number | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined | null>(null);

  const addNewCollaborator = useCallback((newCollaborators: Collaborator[]) => {
    setCollaborators((prevCollaborators) => {
      const seenIds = new Set(
        prevCollaborators.map((collaborator) => collaborator.id),
      );
      const uniqueCollaborators = newCollaborators.filter(
        (collaborator) => !seenIds.has(collaborator.id),
      );
      return [...prevCollaborators, ...uniqueCollaborators];
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollaborators() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/collaborators/${owner}/${repo}`, {
          signal: controller.signal,
        });
        const data = await requireApiSuccess<{
          status: string;
          data: Collaborator[];
          message?: string;
        }>(response, "Failed to fetch collaborators");

        setCollaborators(data.data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch collaborators",
        );
      } finally {
        // In React Strict Mode, an aborted first pass can race with the active request.
        // Keep the loading state until the non-aborted request finishes.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchCollaborators();

    return () => controller.abort();
  }, [owner, repo, branch]);

  useEffect(() => {
    if (addCollaboratorState?.message) {
      if (
        Array.isArray(addCollaboratorState.data) &&
        addCollaboratorState.data.length > 0
      ) {
        addNewCollaborator(addCollaboratorState.data);
      }

      toast.success(addCollaboratorState.message, { duration: 10000 });
      if (
        Array.isArray(addCollaboratorState.errors) &&
        addCollaboratorState.errors.length > 0
      ) {
        toast.error(addCollaboratorState.errors.join("\n"), {
          duration: 10000,
        });
      }
      setInviteDialogOpen(false);
    }
  }, [addCollaboratorState, addNewCollaborator]);

  const handleConfirmRemove = async (collaboratorId: number) => {
    setRemoving((prev) => [...prev, collaboratorId]);

    try {
      const removed = await handleRemoveCollaborator(
        collaboratorId,
        owner,
        repo,
      );

      if (removed.error) {
        toast.error(removed.error);
      } else {
        setCollaborators((prev) =>
          prev.filter((collaborator) => collaborator.id !== collaboratorId),
        );
        toast.success(removed.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPendingRemoveId(null);
      setRemoving((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const handleResetPassword = async (collaboratorId: number, password: string) => {
    setResending((prev) => [...prev, collaboratorId]);

    try {
      const result = await handleResetClientPassword(collaboratorId, owner, repo, password);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(result.message);
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setResending((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const headerNode = useMemo(() => {
    const showInviteAction = !isLoading && !error && collaborators.length > 0;

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Client logins</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link
                  href="https://pagescms.org/docs/configuration/collaborators/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookText />
                  <span className="sr-only">Collaborators docs</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View docs</TooltipContent>
          </Tooltip>
        </div>
        {showInviteAction ? (
          <CreateClientLoginDialog
            owner={owner}
            repo={repo}
            state={addCollaboratorState}
            action={addCollaboratorAction}
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
          />
        ) : null}
      </div>
    );
  }, [
    addCollaboratorAction,
    addCollaboratorState,
    collaborators.length,
    error,
    inviteDialogOpen,
    isLoading,
    owner,
    repo,
  ]);

  useRepoHeader({ header: headerNode });

  const loadingSkeleton = useMemo(
    () => (
      <ul>
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm"
          >
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-5 w-24 text-left rounded" />
            <Button
              variant="outline"
              size="icon-xs"
              className="ml-auto"
              disabled
            >
              <EllipsisVertical />
            </Button>
          </li>
        ))}
      </ul>
    ),
    [],
  );

  if (error) {
    return (
      <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
        <Empty className="max-w-[420px] flex-none">
          <EmptyHeader>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t load the list of collaborators.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const collaboratorToRemove =
    pendingRemoveId === null
      ? null
      : collaborators.find(
          (collaborator) => collaborator.id === pendingRemoveId,
        ) || null;

  return (
    <div className="h-full flex flex-col gap-4">
      {isLoading ? (
        loadingSkeleton
      ) : collaborators.length > 0 ? (
        <>
          <ul>
            {collaborators.map((collaborator) => (
              <li
                key={collaborator.id}
                className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={`https://unavatar.io/${collaborator.email}?fallback=false`}
                    alt={`${collaborator.email}'s avatar`}
                  />
                  <AvatarFallback className="font-medium text-muted-foreground uppercase text-xs">
                    {collaborator.email.split("@")[0].substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="font-medium text-left truncate">
                  {collaborator.email}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="outline"
                      className="ml-auto"
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      {removing.includes(collaborator.id) ||
                      resending.includes(collaborator.id) ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <EllipsisVertical />
                      )}
                      <span className="sr-only">Collaborator actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setResetId(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      Reset password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingRemoveId(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>

          <AlertDialog
            open={Boolean(collaboratorToRemove)}
            onOpenChange={(open) => {
              if (!open) setPendingRemoveId(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{collaboratorToRemove?.email}&quot; will no longer be
                  able to sign in and edit this website.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!collaboratorToRemove) return;
                    void handleConfirmRemove(collaboratorToRemove.id);
                  }}
                >
                  Remove login
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ResetPasswordDialog
            email={collaborators.find((c) => c.id === resetId)?.email ?? null}
            open={resetId !== null}
            onOpenChange={(open) => {
              if (!open) setResetId(null);
            }}
            onSubmit={(password) =>
              resetId === null ? Promise.resolve(false) : handleResetPassword(resetId, password)
            }
          />
        </>
      ) : (
        <div className="flex-1 flex items-center">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No client logins yet</EmptyTitle>
              <EmptyDescription>
                Create a login so your client can sign in with an email and
                password and edit this website.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateClientLoginDialog
                owner={owner}
                repo={repo}
                state={addCollaboratorState}
                action={addCollaboratorAction}
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
              />
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}

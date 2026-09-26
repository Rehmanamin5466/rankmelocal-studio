"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Loader, RefreshCw } from "lucide-react";

// Readable passwords the agency can pass to a client: no 0/O, 1/l/I.
const generatePassword = () => {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied.");
  } catch {
    toast.error("Could not copy. Select the text and copy it manually.");
  }
};

function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="client-password" className="text-sm font-medium">
        Password
      </label>
      <div className="flex gap-2">
        <Input
          id="client-password"
          name="password"
          type="text"
          autoComplete="off"
          minLength={8}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(generatePassword())}>
          <RefreshCw />
          <span className="sr-only">Generate new password</span>
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => void copyText(value)}>
          <Copy />
          <span className="sr-only">Copy password</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        At least 8 characters. Copy it now — it can&apos;t be viewed again, only reset.
      </p>
    </div>
  );
}

type CreateState = { message?: string; error?: string };

function CreateClientLoginDialog({
  owner,
  repo,
  state,
  action,
  open,
  onOpenChange,
  triggerLabel = "Create client login",
}: {
  owner: string;
  repo: string;
  state: CreateState;
  action: (payload: FormData) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel?: string;
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword(generatePassword());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a client login</DialogTitle>
          <DialogDescription>
            Your client signs in at this address with their email and this
            password, and can only edit this website.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="repo" value={repo} />
          <div className="space-y-1.5">
            <label htmlFor="client-name" className="text-sm font-medium">
              Client name
            </label>
            <Input id="client-name" name="name" placeholder="Jane Smith" required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="client-email" className="text-sm font-medium">
              Email (their username)
            </label>
            <Input id="client-email" name="email" type="email" placeholder="jane@theirbusiness.co.uk" required />
          </div>
          <PasswordField value={password} onChange={setPassword} />
          {state?.error ? (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          ) : null}
          <DialogFooter>
            <SubmitButton type="submit" disabled={password.length < 8}>
              Create login
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  email,
  open,
  onOpenChange,
  onSubmit,
}: {
  email: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) setPassword(generatePassword());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {email}. Their old password stops working
            immediately.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const ok = await onSubmit(password);
            setPending(false);
            if (ok) onOpenChange(false);
          }}
        >
          <PasswordField value={password} onChange={setPassword} />
          <DialogFooter>
            <Button type="submit" disabled={pending || password.length < 8}>
              Save new password
              {pending && <Loader className="size-4 animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateClientLoginDialog, ResetPasswordDialog };

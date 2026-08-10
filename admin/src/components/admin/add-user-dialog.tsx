"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useCloseOnSuccess,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addAdminUser } from "@/lib/actions/admins";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";

export function AddUserDialog() {
  const [state, addUser, isAdding] = useActionState(addAdminUser, ADMIN_INITIAL_STATE);
  const [open, setOpen] = useCloseOnSuccess(state);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Add admin
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="add-user-title">
        <DialogHeader>
          <DialogTitle id="add-user-title">Add an admin user</DialogTitle>
          <DialogDescription>
            Invite a new team member to the admin panel. They will use their email and password to log in.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>

        <form id="add-user-form" action={addUser} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-email" className="eyebrow text-steel">
              Email
            </label>
            <Input
              id="admin-email"
              type="email"
              name="email"
              required
              placeholder="e.g. alex@fixitregistry.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-password" className="eyebrow text-steel">
              Initial Password
            </label>
            <Input
              id="admin-password"
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role" className="eyebrow text-steel">
              Role
            </label>
            <Select name="role" defaultValue="viewer" id="admin-role">
              <option value="viewer">Viewer - Read-only access</option>
              <option value="editor">Editor - Can approve claims and moderate</option>
              <option value="owner">Owner - Can manage payouts and users</option>
            </Select>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-rust">
              {state.error}
            </p>
          ) : null}
        </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" disabled={isAdding}>
            {isAdding ? "Adding…" : "Add user"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

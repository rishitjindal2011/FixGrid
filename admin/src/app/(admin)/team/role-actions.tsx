"use client";

import { useActionState } from "react";
import { updateAdminRole, deleteAdminUser } from "@/lib/actions/admins";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function RoleActions({
  userId,
  currentRole,
  isCurrentUser,
  isOwner,
}: {
  userId: string;
  currentRole: "viewer" | "editor" | "owner";
  isCurrentUser: boolean;
  isOwner: boolean;
}) {
  const [updateState, updateRole, isUpdating] = useActionState(updateAdminRole, ADMIN_INITIAL_STATE);
  const [deleteState, deleteUser, isDeleting] = useActionState(deleteAdminUser, ADMIN_INITIAL_STATE);

  if (!isOwner) {
    return <span className="text-steel">—</span>;
  }

  if (isCurrentUser) {
    return <span className="text-steel-soft">You</span>;
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <form action={updateRole}>
        <input type="hidden" name="adminId" value={userId} />
        <Select name="role" defaultValue={currentRole} disabled={isUpdating} className="w-[120px] h-8 text-xs">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </Select>
        {/* Invisible submit button to allow form submission on change - in a real app we'd use onChange to submit via JS but for simplicity we rely on a manual update button or JS ref */}
        <Button type="submit" size="sm" variant="outline" className="ml-2 h-8 px-2" disabled={isUpdating}>
          Save
        </Button>
      </form>

      <form action={deleteUser}>
        <input type="hidden" name="adminId" value={userId} />
        <Button type="submit" size="sm" variant="danger" className="h-8 px-2" disabled={isDeleting}>
          Remove
        </Button>
      </form>
      
      {(updateState.error || deleteState.error) && (
        <span className="text-xs text-rust absolute -bottom-4 right-0">{updateState.error || deleteState.error}</span>
      )}
    </div>
  );
}

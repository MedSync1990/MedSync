import os
import re

base_dir = "/mnt/E/Projects/MedSync/MedSync/frontend/src"

def modify(filepath, old_str, new_str):
    full_path = os.path.join(base_dir, filepath)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        return
    with open(full_path, 'r') as f:
        content = f.read()
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"Modified {filepath}")
    else:
        print(f"String not found in {filepath}: {old_str}")

# ManageStaff.tsx
modify("pages/admin/ManageStaff.tsx", "user?.branch_id", "user?.branchId")
modify("pages/admin/ManageStaff.tsx", "branch_id: user?.branch_id || 1,", "branch_id: user?.branchId || 1,") # The first one probably catches this, but just in case
modify("pages/admin/ManageStaff.tsx", "}).catch(err => {", "}).catch(_err => {")
modify("pages/admin/ManageStaff.tsx", "const lockedCount = 0; // Not fully tracked in backend list endpoint yet", "// const lockedCount = 0; // Not fully tracked in backend list endpoint yet")
modify("pages/admin/ManageStaff.tsx", "timeAgo(selectedStaff.last_login_at)", "timeAgo(selectedStaff.last_login_at || null)")
modify("pages/admin/ManageStaff.tsx", "selectedStaff.last_login_at ? new Date(selectedStaff.last_login_at).toLocaleString() : 'Never'", "selectedStaff.last_login_at ? new Date(selectedStaff.last_login_at).toLocaleString() : 'Never'") # Need to see the exact text
modify("pages/admin/ManageStaff.tsx", "user?.branch_name", "user?.branchName")

# BookAppointment.tsx
modify("pages/receptionist/BookAppointment.tsx", "const [searchParams] = useSearchParams();", "const [] = useSearchParams();") # or remove it. Better remove it if unused.
modify("pages/receptionist/BookAppointment.tsx", "const [searchParams] = useSearchParams();", "useSearchParams();") # let's just do a regex if needed.

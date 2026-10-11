import os

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

# Fix types.ts PatientResponse
modify("api/types.ts", "id_number?: string;", "id_number?: string;\n  is_temp?: boolean;")

# Fix reports branch_name -> branchName
reports = [
    "pages/reports/BranchAppointmentSummary.tsx",
    "pages/reports/DoctorRevenue.tsx",
    "pages/reports/InsuranceVsOutOfPocket.tsx",
    "pages/reports/OutstandingBalances.tsx"
]

for report in reports:
    modify(report, "user?.branch_name", "user?.branchName")

# Fix quickPay unused in DoctorPayments.tsx
import re
path = os.path.join(base_dir, "pages/admin/DoctorPayments.tsx")
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r'const quickPay = async \([^\}]+\}\;', '', content, flags=re.DOTALL)
with open(path, 'w') as f:
    f.write(content)

print("Done")

# Technical Investigation Report: Treatment Category Breakdown PDF Generation & Logo Failure

**Document Version:** 1.0.0  
**Context:** MedSync Healthcare Management Platform (Local Development vs. Azure Cloud Hosting)  
**Target Audience:** Engineering Team & Follow-up AI Reviewers  
**Subject:** 
1. Missing/Hidden PDF controls on the Treatment Breakdown frontend page.
2. Failure of the MedSync logo graphic on Azure-hosted PDF downloads (rendering only `"MedSync Logo"` alt text).

---

## 1. Executive Summary

During auditing of the MedSync reporting module:
* **Observation 1:** On the frontend route `/reports/treatment-categories` ([Treatment Category Breakdown](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/frontend/src/pages/reports/TreatmentCategoryBreakdown.tsx)), users cannot readily locate a standard PDF export action, unlike the other four reporting dashboards.
* **Observation 2:** When the Treatment Category Breakdown PDF is downloaded from a local environment, the MedSync logo appears properly. However, when downloaded from the **Azure-hosted deployment**, the graphic is absent and only the placeholder text **"MedSync Logo"** appears in the header box.

This document records the exact architectural findings, source code references, environment differences, and a structured handover protocol for a secondary AI or developer to validate, refute, or discover deeper underlying faults.

---

## 2. Issue 1: Why the PDF is "Not Showing" on the Treatment Breakdown Page

### 2.1 Architectural Inconsistency Across Report Dashboards
Across the MedSync application, all 5 reporting pages are located in `frontend/src/pages/reports/`:
1. `BranchAppointmentSummary.tsx`
2. `DoctorRevenue.tsx`
3. `OutstandingBalances.tsx`
4. `InsuranceVsOutOfPocket.tsx`
5. `TreatmentCategoryBreakdown.tsx`

In the first 4 dashboards, the table and filter headers consistently provide a unified toolbar:
```tsx
<button onClick={() => handleExport('PDF')}>Export PDF</button>
<button onClick={() => handleExport('CSV')}>Export CSV</button>
```

However, in [TreatmentCategoryBreakdown.tsx](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/frontend/src/pages/reports/TreatmentCategoryBreakdown.tsx):
* **Main Toolbar (Line 339–342):** Only includes `Export CSV`.
* **PDF Action (Line 319–322):** Placed at the bottom of an unrelated informational card under an alternate title:
  ```tsx
  <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} ...>
    {isDownloadingPdf ? 'Generating...' : 'Download Audit PDF'}
  </button>
  ```
* **No In-Browser PDF Preview:** No report in MedSync renders an inline PDF `<iframe src="...">` or canvas viewer. All PDFs are generated dynamically on the server and downloaded as binary blobs (`application/pdf`). Because the button was relocated away from the standard toolbar and renamed, end users perceive the feature as missing.

---

## 3. Issue 2: Why the Logo Shows Locally but Fails on Azure

### 3.1 Template Code & Fallback Mechanism
The HTML template used for this PDF is located at [backend/app/templates/treatment_report_template.html](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/backend/app/templates/treatment_report_template.html#L106-L108):

```html
<div class="logo-box">
    <img src="{{ logo_url }}" alt="MedSync Logo" class="logo">
</div>
```

**WeasyPrint Rendering Engine Rule:**  
When WeasyPrint compiles HTML/CSS into a PDF, if the URI provided in `src` fails to resolve, cannot be read, or is an unsupported format, it defaults to standard HTML browser fallback behavior: **it displays the literal text inside `alt="..."`**. This is why the PDF printed `"MedSync Logo"`.

---

### 3.2 The Primary Culprit: Docker Packaging vs. Local Volume Mounting

#### A. Backend Resolution Code
In [backend/app/routers/reports.py](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/backend/app/routers/reports.py#L433-L436):
```python
from pathlib import Path
logo_path = Path(__file__).resolve().parent.parent.parent / "medsync.webp"
logo_uri = logo_path.as_uri()
```
* File location of `reports.py`: `backend/app/routers/reports.py`.
* `.parent.parent.parent`: Traverses up 3 directory levels:
  `reports.py` → `routers/` (1) → `app/` (2) → `backend/` (3).
* Resulting target path: `backend/medsync.webp`.

#### B. The Production Dockerfile (Used on Azure)
In [backend/Dockerfile](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/backend/Dockerfile#L22-L23):
```dockerfile
WORKDIR /app

# Copy application into the image
COPY app ./app
```
**CRITICAL FLAW:**  
The Dockerfile only copies `backend/app/` into `/app/app/`.  
Because `medsync.webp` is located in `backend/` (outside `backend/app/`), **it is NEVER copied into the container image on Azure!**  
When `reports.py` attempts to find `/app/medsync.webp` inside the Azure container, the file does not exist on the filesystem.

#### C. Why It Worked Locally
In [docker-compose.yml](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/docker-compose.yml#L11-L12):
```yaml
backend:
  volumes:
    - ./backend:/app   # Host volume mount
```
When running locally via Docker Compose, your entire local `./backend` host folder is mounted over `/app`. Because `medsync.webp` existed on your local development disk, the file was present inside `/app/medsync.webp` during local execution.

---

### 3.3 Secondary Architectural Discrepancies
Compare how the other management reports handle logos vs. Treatment Breakdown:

| Attribute | Management Reports (`_management_pdf`) | Treatment Report (`get_treatment_categories_pdf`) |
| :--- | :--- | :--- |
| **Asset Location** | `backend/app/templates/report_logo.png` | `backend/medsync.webp` |
| **Copied into Docker?** | **YES** (Inside `app/templates/`, so copied by `COPY app ./app`) | **NO** (In `backend/`, excluded from `Dockerfile`) |
| **File Format** | Standard PNG | WebP (`.webp`) |
| **Linux Decoder Support** | Supported natively by `cairo` and `gdk-pixbuf` | Requires `webp-pixbuf-loader` in `python:3.12-slim` |
| **Shared Design File** | Uses `backend/app/report_design.py` | Standalone template & custom query |

---

## 4. Instructions for Follow-Up AI / Independent Code Review

> [!IMPORTANT]
> **Directive for the Reviewing AI / Engineer:**
> Do not accept the above Docker copy discrepancy as the sole unquestioned truth. Thoroughly review the system for alternative or compounding failure modes that could be the *actual* or *co-existing* problem in cloud environments.

### Potential Alternative Problem Hypotheses to Verify:

1. **GdkPixbuf / Cairo WebP Decoder Missing in Debian Slim:**
   * Review `backend/Dockerfile` line 9–15:
     ```dockerfile
     RUN apt-get update && apt-get install -y \
         libpango-1.0-0 \
         libpangoft2-1.0-0 \
         libpangocairo-1.0-0 \
         libffi-dev \
         shared-mime-info
     ```
   * *Investigation Question:* Even if `medsync.webp` is copied into the image, does `python:3.12-slim` have the necessary GdkPixbuf loader to decode `.webp` images into PDF? (e.g. is `webp-pixbuf-loader` required, or should the asset be unified to `report_logo.png` like all other reports?)

2. **Base URI & Path Resolution Under Azure App Service / Container Apps:**
   * In `reports.py` line 456:
     ```python
     pdf_bytes = weasyprint.HTML(string=html_string).write_pdf()
     ```
   * *Investigation Question:* Notice that `base_url` is omitted in `weasyprint.HTML(...)`. In earlier commit `760811d`, `base_url="file:///app/"` was removed. Does WeasyPrint require a defined `base_url` or absolute `file://` scheme when running under Azure's security sandbox?

3. **File Permission / Linux User Sandboxing:**
   * Does Azure container execution run under a restricted non-root UID that lacks read permissions to files in `/app` if permissions are not explicitly declared?

4. **Template Unification:**
   * Why does `treatment_report_template.html` exist separately instead of hooking into `backend/app/report_design.py` and `_management_pdf()` like the other 4 reports? Could refactoring it to `_management_pdf` eliminate both the UI and PDF generation disparities permanently?

---

## 5. Verification Checklist for Solution Testing

When the actual fix is applied, the follow-up AI or developer must verify:
- [ ] Build the production Docker image locally without volume mounts:
      `docker build -t medsync-backend-prod ./backend`
- [ ] Run the container with no host volume mounts:
      `docker run -p 8000:8000 medsync-backend-prod`
- [ ] Call `GET /api/v1/reports/treatment-categories/pdf` with valid auth cookies.
- [ ] Inspect the generated PDF binary to confirm the logo renders visually and the text `"MedSync Logo"` does not appear as fallback text.
- [ ] Verify the UI button placement in [TreatmentCategoryBreakdown.tsx](file:///d:/My%20ACA/3rd%20sem/database/project/MedSync/frontend/src/pages/reports/TreatmentCategoryBreakdown.tsx) matches the other report pages.

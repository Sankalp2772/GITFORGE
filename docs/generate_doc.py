import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        cell = hdr_cells[i]
        cell.text = title
        set_cell_background(cell, "1E293B") # Dark slate
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(10)
            run.font.name = "Calibri"
        set_cell_margins(cell, top=120, bottom=120, left=150, right=150)

    # Data Rows
    for r_idx, row_data in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row_cells[c_idx]
            cell.text = str(val)
            set_cell_background(cell, bg_color)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.size = Pt(9.5)
                run.font.name = "Calibri"
                run.font.color.rgb = RGBColor(30, 41, 59)
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)

    # Apply widths if provided
    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    # Set light table border
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders>')
    tblPr.append(borders)

    doc.add_paragraph() # Spacing
    return table

def add_placeholder_box(doc, text="PASTE / DRAW DIAGRAM OR IMAGE HERE"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F1F5F9")
    set_cell_margins(cell, top=300, bottom=300, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"[{text}]")
    run.font.italic = True
    run.font.bold = True
    run.font.color.rgb = RGBColor(100, 116, 139)
    run.font.size = Pt(11)

    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="dashed" w:sz="8" w:space="0" w:color="94A3B8"/><w:bottom w:val="dashed" w:sz="8" w:space="0" w:color="94A3B8"/><w:left w:val="dashed" w:sz="8" w:space="0" w:color="94A3B8"/><w:right w:val="dashed" w:sz="8" w:space="0" w:color="94A3B8"/></w:tblBorders>')
    tblPr.append(borders)
    doc.add_paragraph()

doc = Document()

# Set standard 1 inch margins
for section in doc.sections:
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

# Title
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(2)
run_title = title_p.add_run("CHAPTER 4 — SPRINT 1 STUDENT HANDBOOK")
run_title.font.name = "Calibri"
run_title.font.size = Pt(18)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(15, 23, 42)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(14)
run_sub = sub_p.add_run("Complete Solution Design & Implementation")
run_sub.font.name = "Calibri"
run_sub.font.size = Pt(13)
run_sub.font.color.rgb = RGBColor(71, 85, 105)

# 4.1 Section
h2 = doc.add_heading("4.1 Team and Engine Register", level=2)
h2.paragraph_format.space_after = Pt(4)
note_p = doc.add_paragraph()
note_run = note_p.add_run("Enter team information only here. In the remaining sections use Engine ID (E1, E2, ...), requirement ID and diagram reference. Do not re-enter names or team details.")
note_run.font.italic = True
note_run.font.size = Pt(9.5)
note_run.font.color.rgb = RGBColor(100, 116, 139)

# Register Table
headers1 = ["Field", "Student entry"]
data1 = [
    ["Team number", "Team 1"],
    ["Theme", "System Software and Development Tools"],
    ["Artefact", "Incremental Build and Dependency Resolution Tool (GitForge Platform)"],
    ["Guide name", "Mr. Dheerajkumar"],
    ["Department", "Computer Science & Engineering"],
    ["Repository link", "https://github.com/Sankalp2772/GITFORGE.git"],
    ["Date", "18 November 2026"]
]
create_styled_table(doc, headers1, data1, [2.2, 4.3])

# Team Members Table
doc.add_heading("Team Members", level=3)
headers_members = ["Student", "SRN / USN", "Student name", "Engine / main responsibility"]
data_members = [
    ["Student A", "To be added", "Sankalp Prakash Patil", "E2 — Dependency and Impact Analysis"],
    ["Student B", "To be added", "Abdul Khadar I", "E1 — Change Detection and Language Adapters"],
    ["Student C", "To be added", "Pranav Naik", "E3 — Scheduling, Execution, Cache and State"],
    ["Student D", "To be added", "Saiprasad B J", "E4 — Networked Worker Coordination & Core Host"]
]
create_styled_table(doc, headers_members, data_members, [1.0, 1.3, 1.8, 2.4])

# Approved Engines Table
doc.add_heading("Approved Engines", level=3)
headers_engines = ["Engine ID", "Approved engine name", "Owner (A–E)", "Main function"]
data_engines = [
    ["E1", "Change Detection and Language Adapter Engine", "B", "Manifest validation, path scan, SHA-256 fingerprints, delta change set and multi-language adapters."],
    ["E2", "Dependency and Impact Analysis Engine", "A", "Build graph, source AST/regex parsing, target closure, reverse BFS impact analysis, Kahn's topological sort and cycle detection."],
    ["E3", "Scheduling, Execution, Cache and State Engine", "C", "Action state machine, hermetic execution sandbox, SHA-256 Content-Addressable Storage (CAS) cache, parallel scheduler and build history."],
    ["E4", "Networked Worker Coordination & Host Engine", "D", "Bare Git repository life-cycle, Git Smart HTTP streaming RPC (git-upload-pack / git-receive-pack), and LAN worker dispatch protocol."],
    ["E5", "Not used — architecture has four engines", "N/A", "OOP is cross-cutting; it is not a fifth engine."]
]
create_styled_table(doc, headers_engines, data_engines, [0.9, 1.8, 0.9, 2.9])

# Overall System Architecture
doc.add_page_break()
doc.add_heading("Overall System Architecture", level=2)
p_oa = doc.add_paragraph("Show actors, the main parts/engines, data storage and links between them. Do this before describing any engine internally.")
p_oa.runs[0].font.italic = True
p_oa.runs[0].font.size = Pt(9.5)

add_placeholder_box(doc, "PASTE / DRAW DIAGRAM OR IMAGE HERE (Overall System Architecture)")

headers_arch = ["Main part / engine", "What it does"]
data_arch = [
    ["Developer / Web UI & CLI", "Interacts via React 18 Monaco code browser, visual DAG canvas, terminal run manager, and Git CLI (git clone, git push)."],
    ["E1 — Change Detection & Adapters", "Validates build.manifest.json, reads Git commit trees, calculates deterministic SHA-256 file fingerprints, and computes delta changes."],
    ["E2 — Dependency & Impact Analysis", "Parses imports/includes into a Directed Acyclic Graph (DAG), executes reverse BFS impact traversal, and runs Kahn's topological sort for build scheduling."],
    ["E3 — Scheduling, Execution & Cache", "Orchestrates action queue, checks Content-Addressable Storage (CAS) for cache hits, dispatches jobs across 1/2/4/8 parallel workers, and persists build metrics."],
    ["E4 — Git Host & Worker Dispatch", "Hosts bare Git repositories, executes Git Smart HTTP streaming RPC (stateless-rpc), and coordinates remote LAN/process worker execution."],
    ["Storage & Toolchains", "MySQL 8.0 database (relational state/metadata), Bare Git repos (data/repos/), CAS Cache (data/build-cache/), and MinGW/CMake/Node compilers."]
]
create_styled_table(doc, headers_arch, data_arch, [2.2, 4.3])

p_link1 = doc.add_paragraph()
r1 = p_link1.add_run("Diagram / evidence filename or repository link: ")
r1.font.bold = True
p_link1.add_run("docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/diagrams/system_architecture.png | https://github.com/Sankalp2772/GITFORGE.git")

# Engine Interaction and Dependencies
doc.add_heading("Engine Interaction and Dependencies", level=2)
p_ei = doc.add_paragraph("Show which engine communicates with which other engine and what information is exchanged.")
p_ei.runs[0].font.italic = True
p_ei.runs[0].font.size = Pt(9.5)

add_placeholder_box(doc, "PASTE / DRAW DIAGRAM OR IMAGE HERE (Engine Interaction Diagram)")

headers_interact = ["From engine", "To engine", "Data / message exchanged"]
data_interact = [
    ["E1", "E2", "Validated BuildManifest, scanned file snapshots, SHA-256 fingerprints, and delta ChangeSet (modified, added, deleted)."],
    ["E2", "E3", "Directed Acyclic Graph (SourceDependencyGraph), AffectedAnalysisResult, topologically sorted execution batches, and cycle diagnostics."],
    ["E3", "E4 / Storage", "Action-key hashes, compilation artifact digests, CAS cache queries, and build performance metrics."],
    ["E4", "E1 / E3", "Commit references, bare Git file tree blobs, worker dispatch tasks, stdio streams, and remote execution exit codes."]
]
create_styled_table(doc, headers_interact, data_interact, [1.1, 1.1, 4.3])

p_link2 = doc.add_paragraph()
r2 = p_link2.add_run("Diagram / evidence filename or repository link: ")
r2.font.bold = True
p_link2.add_run("server/src/build-engine/controllers/buildEngineController.ts | https://github.com/Sankalp2772/GITFORGE.git")

# Engine-wise Architecture
doc.add_page_break()
doc.add_heading("Engine-wise Architecture", level=2)
p_ew = doc.add_paragraph("Prepare this once per approved engine. Show the parts inside the engine, its inputs, outputs and main operations.")
p_ew.runs[0].font.italic = True
p_ew.runs[0].font.size = Pt(9.5)

headers_ewise = ["Engine ID", "Main responsibility", "Inputs", "Outputs"]
data_ewise = [
    ["E1", "Manifest validation, commit snapshot scan, SHA-256 hashing, and language adapters", "build.manifest.json, commit SHA, source tree", "Validated target definitions, file fingerprint map, and categorized change set"],
    ["E2", "Multi-language import parsing, DAG builder, reverse BFS impact analysis, and Kahn's sort", "Source file contents, change set, target dependencies", "SourceDependencyGraph, directly/transitively affected files, deterministic build batches, cycle error list"],
    ["E3", "Parallel build scheduler, hermetic runner, Content-Addressable Cache (CAS), and run manager", "Ordered build plan, action inputs, compilation commands", "Cached/compiled binaries (.o, .exe), real-time execution stdout/stderr logs, build metrics"],
    ["E4", "Native Git Smart HTTP server, bare repo manager, and worker execution bridge", "Git CLI packet streams, HTTP Basic Auth / JWT, worker dispatch commands", "Git pkt-line responses, repository checkout trees, process stdio streaming sessions"],
    ["Cross-cutting", "Web UI, REST API, authentication middleware, and error handling", "HTTP requests, user interactions", "React 18 SPA, Monaco Editor views, JWT tokens, and structured error responses"]
]
create_styled_table(doc, headers_ewise, data_ewise, [0.8, 2.0, 1.7, 2.0])

doc.add_paragraph("Paste Engine-wise Architecture Diagram(s) — duplicate this space for each engine").runs[0].font.bold = True
add_placeholder_box(doc, "PASTE / DRAW DIAGRAM OR IMAGE HERE (E1, E2, E3, E4 Architecture Diagrams)")

p_link3 = doc.add_paragraph()
r3 = p_link3.add_run("Diagram / evidence filename or repository link: ")
r3.font.bold = True
p_link3.add_run("server/src/build-engine/ (Submodules: scanner, dependency, impact, planner, cache, scheduler) | https://github.com/Sankalp2772/GITFORGE.git")

# Database Design
doc.add_heading("Database Design", level=2)
p_db = doc.add_paragraph("Complete only if the project stores structured data. Draw an ER diagram and list the important tables and fields.")
p_db.runs[0].font.italic = True
p_db.runs[0].font.size = Pt(9.5)

add_placeholder_box(doc, "PASTE / DRAW DIAGRAM OR IMAGE HERE (Entity Relationship ER Diagram)")

headers_db = ["Table / entity", "Key fields", "Relation / purpose"]
data_db = [
    ["User", "id (PK), username, email, passwordHash, role, createdAt", "Core user identity, authentication, and platform authorization."],
    ["Repository", "id (PK), name, ownerId (FK -> User), visibility, defaultBranch, diskPath", "Stores repository metadata, access level, and bare Git directory mapping."],
    ["RepoMember", "id (PK), repositoryId (FK), userId (FK), role (OWNER, ADMIN, WRITE, READ)", "RBAC access control permissions governing Web UI and Git CLI operations."],
    ["PullRequest & Issue", "id (PK), repositoryId (FK), authorId (FK), sourceBranch, targetBranch, status", "Code review workflows, branch diff tracking, and issue management."],
    ["BuildHistory", "id (PK), repositoryId (FK), commitSha, status, durationMs, summary", "Persists build results, cache hit ratios, and historical execution performance."],
    ["CAS Object Store", "hash (PK / filename), file content buffer", "Content-Addressable Storage directory storing cached compiled artifacts by SHA-256."]
]
create_styled_table(doc, headers_db, data_db, [1.5, 2.3, 2.7])

p_link4 = doc.add_paragraph()
r4 = p_link4.add_run("Diagram / evidence filename or repository link: ")
r4.font.bold = True
p_link4.add_run("docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/05_DATABASE_AND_ER_DIAGRAM.md | server/prisma/schema.prisma")

# Algorithm and Data Structure
doc.add_page_break()
doc.add_heading("Algorithm and Data Structure", level=2)
p_alg = doc.add_paragraph("For each engine that uses a significant algorithm, briefly show the steps and why the method is suitable.")
p_alg.runs[0].font.italic = True
p_alg.runs[0].font.size = Pt(9.5)

headers_alg = ["Engine ID", "Algorithm / data structure", "Why selected"]
data_alg = [
    ["E1", "SHA-256 Cryptographic Hash Stream (crypto.createHash('sha256')) & Key-Value Maps", "Guarantees deterministic, content-based change detection. Immune to false positives caused by file timestamp/mtime touches."],
    ["E2", "Reverse BFS Traversal & Adjacency Lists (Record<string, Set<string>>)", "Inverts the dependency graph (O(V+E) complexity) to discover all 1-hop direct and multi-hop transitive dependents affected by a change."],
    ["E2", "Kahn's Topological Sorting Algorithm & In-Degree Queue Array", "Computes a linear execution order for dependencies in O(V+E) time. Naturally detects circular dependencies when sortedCount != |V|."],
    ["E3", "Content-Addressable Storage (CAS) & Parallel Wave Batching", "Keys action outputs by input digests (SHA-256(inputs + flags + command)). Skips recompiling unchanged code and groups independent targets into parallel threads."],
    ["E4", "Git Smart HTTP pkt-line Framing & Subprocess Stream Pipe", "Complies with Git protocol v2 packet framing (0032# service=...) and pipes chunked byte streams directly between Git CLI and backend without memory bloat."]
]
create_styled_table(doc, headers_alg, data_alg, [0.9, 2.4, 3.2])

doc.add_paragraph("Algorithm Flowchart / Pseudocode Image (if useful)").runs[0].font.bold = True
add_placeholder_box(doc, "PASTE / DRAW DIAGRAM OR IMAGE HERE (BFS Impact & Kahn's Topological Sort Flowcharts)")

p_link5 = doc.add_paragraph()
r5 = p_link5.add_run("Diagram / evidence filename or repository link: ")
r5.font.bold = True
p_link5.add_run("server/src/build-engine/impact/affectedAnalysisService.ts | server/src/build-engine/planner/buildPlannerService.ts")

# Security, Errors and Testing
doc.add_heading("Security, Errors and Testing", level=2)
p_sec = doc.add_paragraph("Show important permissions, validation and error responses. Explain how you will check the design.")
p_sec.runs[0].font.italic = True
p_sec.runs[0].font.size = Pt(9.5)

headers_sec = ["Area", "Simple student explanation"]
data_sec = [
    ["Who can access or change important data?", "Authentication is enforced via JWT (Web UI) and HTTP Basic Auth (Git CLI). Repository RBAC levels (OWNER, ADMIN, WRITE, READ) restrict push/merge capabilities. The build executor isolates command arguments to prevent shell command injection."],
    ["What happens for invalid input or a failed request?", "Manifest validation stops builds on syntax errors or invalid paths. Cyclic dependencies halt the planner and isolate cycle nodes. Non-zero compilation exits transition tasks to FAILED, halt dependent downstream actions, and forbid caching broken artifacts."],
    ["Is copying of large data necessary, and who owns it?", "No unnecessary duplication. The Git engine reads directly from bare Git trees via git cat-file without full disk checkout. CAS store links compiled objects by hash, avoiding redundant copies of identical .o binaries."],
    ["How will you test the main functions?", "1. Unit Tests: Validating regex dependency extractors for C++, Python, and TypeScript.\n2. Graph Tests: Cycle detection test cases and verifying topological order.\n3. Cache Correctness: Comparing clean build SHA outputs against incremental cached build outputs.\n4. Security Tests: Injecting invalid command arguments and unauthorized Git pushes."]
]
create_styled_table(doc, headers_sec, data_sec, [2.3, 4.2])

p_link6 = doc.add_paragraph()
r6 = p_link6.add_run("Diagram / evidence filename or repository link: ")
r6.font.bold = True
p_link6.add_run("docs/GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION/11_IMPLEMENTATION_STATUS.md | https://github.com/Sankalp2772/GITFORGE.git")

output_path = r"D:\GITFORGE\gitforge\docs\CHAPTER_4_SPRINT_1_STUDENT_HANDBOOK.docx"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
doc.save(output_path)
print("Successfully generated Word document at:", output_path)

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_header_banner(doc, title_text, subtitle_text=""):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, "1E293B") # Dark slate
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r1 = p.add_run(title_text)
    r1.font.name = "Calibri"
    r1.font.size = Pt(13)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(255, 255, 255)
    
    if subtitle_text:
        r2 = p.add_run(f" | {subtitle_text}")
        r2.font.name = "Calibri"
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(203, 213, 225)
    
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="none"/><w:bottom w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>')
    tblPr.append(borders)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def create_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        cell = hdr_cells[i]
        cell.text = title
        set_cell_background(cell, "334155") # Slate gray
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(9.5)
            run.font.name = "Calibri"
        set_cell_margins(cell, top=100, bottom=100, left=130, right=130)

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
                run.font.size = Pt(9.0)
                run.font.name = "Calibri"
                run.font.color.rgb = RGBColor(30, 41, 59)
            set_cell_margins(cell, top=80, bottom=80, left=130, right=130)

    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders>')
    tblPr.append(borders)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table

def add_placeholder_box(doc, text="PASTE / DRAW DIAGRAM OR IMAGE HERE"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=320, bottom=320, left=200, right=200)
    
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
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

doc = Document()

# Set standard margins (0.75 in)
for section in doc.sections:
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# ----------------------------------------------------
# PAGE 1: S1 FUNCTIONAL REQUIREMENTS ENGINEERING
# ----------------------------------------------------
add_header_banner(doc, "S1 FUNCTIONAL REQUIREMENTS ENGINEERING", "Common Team Information")

headers_info = ["Field", "Student Entry"]
data_info = [
    ["Team No.", "1"],
    ["Project Theme / Title", "Incremental Build and Dependency Resolution Tool (GitForge Platform) — A high-performance incremental build engine and Git hosting toolchain"],
    ["Guide Name", "Mr. Dheerajkumar"],
    ["Date Prepared", "18 November 2026"]
]
create_table(doc, headers_info, data_info, [2.0, 4.8])

doc.add_heading("Team Register", level=3)
headers_members = ["Sl. No.", "SRN / USN", "Student Name"]
data_members = [
    ["1", "To be added", "Sankalp Prakash Patil"],
    ["2", "To be added", "Abdul Khadar I"],
    ["3", "To be added", "Pranav Naik"],
    ["4", "To be added", "Saiprasad B J"]
]
create_table(doc, headers_members, data_members, [1.0, 2.0, 3.8])

# 1. Functional Requirements (FR)
h1 = doc.add_heading("1. Functional Requirements (FR)", level=2)
h1.paragraph_format.space_before = Pt(6)
h1.paragraph_format.space_after = Pt(4)
for r in h1.runs:
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)

headers_fr = ["FR ID", "Description", "Priority (Mandatory / Challenge)", "Source Need (from S0)"]
data_fr = [
    [
        "FR1",
        "The system shall parse and validate project build manifests (build.manifest.json) against schema constraints, blocking shell-injection vectors, command chaining, and directory escapes. [E1]",
        "Mandatory",
        "Objectives (§2): 1\nIn scope (§5.1): 1\nConstraints (§6): Invalid manifests halt execution\nLibraries (§6): JSON parser\nOut of scope (§5.2): 3 (automated syntax correction)"
    ],
    [
        "FR2",
        "The system shall scan source files directly from Git commit snapshots without cloning, compute deterministic SHA-256 content fingerprints, and emit delta change sets (modified, added, deleted). [E1]",
        "Mandatory",
        "Objectives (§2): 1\nIn scope (§5.1): 1\nConstraints (§6): Timestamps alone are disallowed\nLibraries (§6): crypto SHA-256 stream"
    ],
    [
        "FR3",
        "The system shall parse source code imports across multiple languages (C/C++ #include, TS/JS import/require, Python import) to construct an in-memory Directed Acyclic Graph (DAG). [E2]",
        "Mandatory",
        "Objectives (§2): 2\nIn scope (§5.1): 2\nConstraints (§6): Dynamic include path edge cases\nLibraries (§6): Language analyzer registry"
    ],
    [
        "FR4",
        "The system shall execute reverse Breadth-First Search (BFS) impact analysis to determine directly and transitively affected compilation targets from the change set. [E2]",
        "Mandatory",
        "Objectives (§2): 3\nIn scope (§5.1): 3\nConstraints (§6): Graph cycle checks\nLibraries (§6): Adjacency list and BFS queue implemented by team"
    ],
    [
        "FR5",
        "The system shall compute deterministic build execution order using Kahn's topological sort and detect circular dependencies, isolating cycle nodes when present. [E2]",
        "Mandatory",
        "Objectives (§2): 3\nIn scope (§5.1): 4\nConstraints (§6): Circular dependency deadlocks\nLibraries (§6): Kahn's sort implemented by team"
    ],
    [
        "FR6",
        "The system shall manage a SHA-256 Content-Addressable Storage (CAS) cache for compiled object binaries (.o) to skip rebuilding actions when action keys match. [E3]",
        "Mandatory",
        "Objectives (§2): 4\nIn scope (§5.1): 5\nConstraints (§6): Cache poisoning / corrupt blobs\nLibraries (§6): CAS file store implemented by team"
    ],
    [
        "FR7",
        "The system shall schedule and execute independent compilation batches in parallel across configurable worker pools (1, 2, 4, 8 cores) with real-time stdio streaming. [E3]",
        "Mandatory",
        "Objectives (§2): 4\nIn scope (§5.1): 6\nConstraints (§6): Workstation core limits\nLibraries (§6): child_process.spawn runner"
    ],
    [
        "FR8",
        "The system may dispatch remote compilation tasks to trusted LAN workers via framed TCP packets with digest verification and local fallback. [E4]",
        "Challenge",
        "Objectives (§2): 4, 5\nIn scope (§5.1): Optional extension\nConstraints (§6): LAN network timeouts\nOut of scope (§5.2): 1 (cloud cluster farm)"
    ]
]
create_table(doc, headers_fr, data_fr, [0.7, 2.7, 1.2, 2.2])

# 2. Non-Functional Requirements (NFR)
h2 = doc.add_heading("2. Non-Functional Requirements (NFR)", level=2)
h2.paragraph_format.space_before = Pt(6)
h2.paragraph_format.space_after = Pt(4)
for r in h2.runs:
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)

headers_nfr = ["NFR ID", "Description", "Category", "Measurable Target"]
data_nfr = [
    [
        "NFR1",
        "Incremental build output must be byte-for-byte identical to a clean build from scratch for any valid repository snapshot.",
        "Correctness & Equivalence — E3 / E2",
        "100% cryptographic SHA-256 equivalence between clean build binaries and incremental build artifacts over 50 test iterations."
    ],
    [
        "NFR2",
        "Change detection and DAG dependency graph generation must execute fast on standard developer workstations.",
        "Performance — E1 & E2",
        "95th-percentile scan and graph construction latency <= 300 ms for repositories up to 5,000 files and 20,000 dependency edges."
    ],
    [
        "NFR3",
        "Parallel build throughput must scale with available worker cores on multi-core systems.",
        "Scalability & Concurrency — E3",
        "At least 70% parallel efficiency at 4 worker slots on a quad-core CPU; reported speedup curves across 1, 2, 4, and 8 workers."
    ],
    [
        "NFR4",
        "Content-Addressable Storage (CAS) cache hits must skip execution completely without running compilers.",
        "Resource Efficiency — E3",
        "Action key lookup latency <= 15 ms; 0 ms compiler CPU time expended on actions with unchanged inputs and action keys."
    ],
    [
        "NFR5",
        "Failed actions, timeouts, or corrupt artifacts must never corrupt the build cache or break subsequent builds.",
        "Hermeticity & Fault Tolerance — E3 / E1",
        "0 corrupt objects written to CAS on simulated SIGKILL, process timeouts, or compiler exit code != 0; dependent actions safely blocked."
    ]
]
create_table(doc, headers_nfr, data_nfr, [0.7, 2.4, 1.6, 2.1])

# ----------------------------------------------------
# PAGE 2: EVIDENCE 2 OF 7 — USE CASES / USER STORIES
# ----------------------------------------------------
doc.add_page_break()
add_header_banner(doc, "EVIDENCE 2 OF 7 — USE CASES / USER STORIES", "Stage S1 — Functional Requirements Engineering | General, Theme-Independent")

# 1. Use Case / User Story Table
doc.add_heading("1. Use Case / User Story Table", level=2)
headers_uc = ["ID", "Actor", "Description / User Story", "Main Flow", "Exception Flow"]
data_uc = [
    [
        "UC1",
        "Developer / CI Agent",
        "Developer modifies source files and triggers incremental build.",
        "Developer pushes code or runs build -> E1 scans snapshot and hashes files -> E1 computes delta change set -> E2 builds DAG -> E2 computes BFS impact -> E3 compiles affected actions and caches results.",
        "Syntax error in source -> compiler fails with non-zero exit; failure logged; dependent actions blocked; broken output not cached."
    ],
    [
        "UC2",
        "Developer / CI Agent",
        "Developer runs build where no files changed (zero-change build).",
        "E1 compares SHA-256 hashes against baseline -> change set is empty -> E3 confirms all action keys exist in CAS -> build marked 100% cached.",
        "CAS object missing from disk -> cache miss reported; target rebuilds automatically and restores cache."
    ],
    [
        "UC3",
        "System (E1)",
        "System detects corrupted or malicious manifest file.",
        "E1 loads build.manifest.json -> verifies targets, inputs, outputs, commands -> parses without errors -> passes to E2.",
        "JSON syntax error, path escaping outside repo (e.g., ../), or prohibited chaining (;, &&, |) -> build stops immediately with clear diagnostic."
    ],
    [
        "UC4",
        "System (E2)",
        "System detects circular dependency cycle in project targets.",
        "E2 runs Kahn's topological sort -> calculates in-degrees -> processes all nodes -> returns linear build batches.",
        "In-degree queue empties with remaining targets -> hasCycle = true; cycle nodes isolated and returned; build halts before running compilers."
    ],
    [
        "UC5",
        "System (E3)",
        "System executes compilation tasks in parallel across worker pool.",
        "E3 takes independent parallel batches from Kahn's sort -> dispatches actions to worker threads (1/2/4/8) -> streams logs -> saves binaries to CAS.",
        "Worker process times out or exits non-zero -> worker slot freed; error captured in log; dependent downstream actions marked BLOCKED."
    ],
    [
        "UC6",
        "Developer",
        "Developer inspects visual dependency graph on web canvas.",
        "Developer opens /build-engine/dependency-graph -> frontend queries graph API -> ReactFlow renders nodes (files) and edges (dependencies) -> user zooms/filters.",
        "Unresolved import path -> node highlighted in warning color; unresolved dependency table lists missing specifier."
    ],
    [
        "UC7",
        "Developer",
        "Developer executes binary in interactive terminal session.",
        "Developer selects compiled target -> opens terminal runner -> child process spawns -> stdio streams bidirectionally -> user enters interactive inputs.",
        "Process crashes during execution -> terminal logs signal/error code; process session cleaned up safely."
    ],
    [
        "UC8",
        "Developer / CLI",
        "Developer clones/pushes to bare Git repository via Git CLI.",
        "Developer executes git clone or git push -> GitForge smart HTTP interceptor authenticates user -> spawns git-upload-pack or git-receive-pack -> pipes streams.",
        "Invalid HTTP Basic Auth credentials or unauthorized repo -> 401 Unauthorized / 403 Forbidden returned."
    ],
    [
        "UC9",
        "System (E3 Cache)",
        "System purges stale cache entries or verifies cache integrity.",
        "Developer/System runs cache clean/verify -> CAS scans object hashes -> verifies file digests against filenames -> reports stats.",
        "Hash mismatch detected -> corrupted cache object removed; subsequent build triggers clean recompilation."
    ],
    [
        "UC10",
        "Developer / Lead",
        "Developer evaluates build metrics, speedup curves, and cache hit ratios.",
        "Developer opens Build History -> system displays past builds, duration, cache hit percentage, and affected target count.",
        "No historical builds found -> UI displays prompt to run initial baseline build."
    ]
]
create_table(doc, headers_uc, data_uc, [0.6, 1.1, 1.6, 1.9, 1.6])

# 2. Use Case Diagram
doc.add_heading("2. Use Case Diagram", level=2)
add_placeholder_box(doc, "PASTE / DRAW USE CASE DIAGRAM HERE (Actors: Developer, Git CLI, System | Subsystems: E1 Scan, E2 Impact/DAG, E3 Scheduler/CAS, E4 Git Host)")

# ----------------------------------------------------
# PAGE 3: EVIDENCE 3 OF 7 — ACCEPTANCE CRITERIA SHEET
# ----------------------------------------------------
doc.add_page_break()
add_header_banner(doc, "EVIDENCE 3 OF 7 — ACCEPTANCE CRITERIA SHEET", "Stage S1 — Functional Requirements Engineering | General, Theme-Independent")

# 1. Acceptance Criteria per Requirement
doc.add_heading("1. Acceptance Criteria per Requirement", level=2)
headers_ac = ["Requirement ID", "Acceptance Criteria", "Test / Verification Method"]
data_ac = [
    [
        "FR1",
        "A valid build.manifest.json parses successfully; invalid JSON, duplicate target names, missing inputs/outputs, or malicious shell metacharacters (;, |, &&, `, $) are rejected with informative errors.",
        "server/src/build-engine/manifest/manifestParser.ts; automated unit tests for manifest schema validation."
    ],
    [
        "FR2",
        "Modifying a source file updates its SHA-256 digest; unchanged files retain exact digests; delta change set correctly categorizes modified, added, and deleted files without false positives.",
        "server/src/build-engine/detection/changeDetectionService.ts; tests comparing touched-mtime vs modified-content."
    ],
    [
        "FR3",
        "Source files across C/C++, TS/JS, and Python have their local imports resolved; unresolved third-party specifiers are flagged without crashing; visual DAG renders nodes and edges correctly.",
        "server/src/build-engine/dependency/graph/graphBuilder.ts; UI testing on /build-engine/dependency-graph."
    ],
    [
        "FR4",
        "When a header file changes (e.g., calculator.hpp), reverse BFS flags direct dependents (calculator.cpp, main.cpp) and multi-hop dependents; unaffected files remain flagged as unchanged.",
        "server/src/build-engine/impact/affectedAnalysisService.ts; BFS traversal depth assertion tests."
    ],
    [
        "FR5",
        "Targets execute in strictly prerequisite-first order; circular target dependencies (A -> B -> A) are detected, reported with exact cycle node names, and execution is aborted before compilation.",
        "server/src/build-engine/planner/buildPlannerService.ts; Kahn's sort unit tests with cyclic and acyclic graph inputs."
    ],
    [
        "FR6",
        "Rebuilding with identical inputs achieves 100% cache hits and 0 compiler invocations; modifying one input re-executes only impacted targets and materializes cached objects from CAS.",
        "server/src/build-engine/cache/buildCacheService.ts; clean vs cached build speed and artifact comparison."
    ],
    [
        "FR7",
        "Building across 1, 2, 4, and 8 worker slots executes independent batches concurrently without race conditions; stdout/stderr are captured per action; non-zero exit blocks dependent actions.",
        "server/src/build-engine/scheduler/parallelBuildScheduler.ts; concurrency stress tests and mock failure runs."
    ],
    [
        "FR8",
        "When remote worker dispatch is enabled, tasks transfer via framed TCP with SHA-256 payload integrity; unreachable workers trigger fallback to local execution without dropping builds.",
        "server/src/build-engine/runner/localRunManager.ts and network dispatcher protocol verification tests."
    ]
]
create_table(doc, headers_ac, data_ac, [1.2, 3.4, 2.2])

output_path = r"D:\GITFORGE\gitforge\docs\GATE_1_REQUIREMENTS_ENGINEERING_TEAM_1.docx"
doc.save(output_path)
print("Successfully generated Gate 1 Word document at:", output_path)

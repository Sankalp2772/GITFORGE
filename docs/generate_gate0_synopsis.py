import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)

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
            set_cell_margins(cell, top=90, bottom=90, left=140, right=140)

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
    set_cell_margins(cell, top=350, bottom=350, left=200, right=200)
    
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

# Section 1: Header Banner & Project Details
add_header_banner(doc, "GATE 0 - PROJECT SYNOPSIS", "Themes 1-5 | System / Tool / Engine based Mini Projects")

headers_info = ["Field", "Student entry"]
data_info = [
    ["Team No.", "1"],
    ["Theme No.", "1 (System Software and Development Tools)"],
    ["Project Title", "Incremental Build and Dependency Resolution Tool (GitForge Platform)"],
    ["Guide Name", "Mr. Dheerajkumar"],
    ["Team Members", "1. Sankalp Prakash Patil   2. Abdul Khadar I   3. Pranav Naik   4. Saiprasad B J"]
]
create_table(doc, headers_info, data_info, [2.0, 4.8])

# 1. Background & Motivation
h1 = doc.add_heading("1. Background & Motivation", level=2)
h1.paragraph_format.space_before = Pt(6)
h1.paragraph_format.space_after = Pt(4)
for run in h1.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

p_bg = doc.add_paragraph(
    "In modern software engineering, large-scale codebases undergo hundreds of commits and modifications daily. "
    "Recompiling and linking the entire repository from scratch for every minor source modification causes massive development overhead, "
    "idle CPU cycles, and severe CI/CD deployment bottlenecks. While basic tools like Make rely solely on file modification timestamps (mtime)—"
    "which are notoriously prone to false rebuilds, branch-switch inaccuracies, and clock skews—enterprise engines like Bazel are complex, heavy, "
    "and decoupled from lightweight self-hosted code environments.\n\n"
    "An Incremental Build and Dependency Resolution Tool overcomes these challenges by replacing naive timestamps with deterministic cryptographic "
    "content fingerprinting (SHA-256), constructing deep Abstract Syntax Tree (AST) dependency graphs, and performing automated impact analysis. "
    "Our project, GitForge, pairs native bare-Git repository hosting with a high-performance incremental compilation subsystem: multi-language source "
    "dependency graphs identify direct and transitive change impacts, Kahn's topological sort arranges safe compilation waves across parallel worker slots, "
    "and a SHA-256 Content-Addressable Storage (CAS) cache eliminates redundant compilation entirely."
)
for r in p_bg.runs:
    r.font.name = "Calibri"
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(51, 65, 85)
p_bg.paragraph_format.space_after = Pt(6)

# 2. Project Objectives
h2 = doc.add_heading("2. Project Objectives", level=2)
h2.paragraph_format.space_before = Pt(6)
h2.paragraph_format.space_after = Pt(4)
for run in h2.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

objs = [
    "1. Develop a high-speed SHA-256 fingerprinting and manifest validation engine (E1) to detect delta change sets (modified, added, deleted files) without relying on unreliable file timestamps.",
    "2. Construct source-level Directed Acyclic Graphs (DAGs) (E2) across multiple languages (C/C++, TS/JS, Python) to map direct and transitive compilation dependencies.",
    "3. Implement reverse Breadth-First Search (BFS) impact analysis and Kahn's topological sorting algorithm (E2) to establish deterministic, cycle-free build schedules.",
    "4. Build a parallel execution scheduler and Content-Addressable Storage (CAS) cache (E3) to run independent targets across worker threads and skip unchanged compile actions.",
    "5. Provide an interactive Monaco code browser, visual DAG canvas, and terminal run manager (E4/Frontend) integrated directly with native Git Smart HTTP repository hosting."
]
for obj in objs:
    p_obj = doc.add_paragraph(obj)
    p_obj.paragraph_format.space_after = Pt(2)
    p_obj.paragraph_format.left_indent = Inches(0.2)
    for r in p_obj.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(51, 65, 85)

# Page Break for Foundation Integration
doc.add_page_break()

# Section 2: Header Banner
add_header_banner(doc, "FOUNDATION COURSE INTEGRATION & CONCEPTUAL VIEW", "Gate 0 - Themes 1-5")

# 3. Foundation Course Integration
h3 = doc.add_heading("3. Foundation Course Integration", level=2)
h3.paragraph_format.space_before = Pt(4)
h3.paragraph_format.space_after = Pt(4)
for run in h3.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

headers_fci = ["Sl. No.", "Foundation Course", "Broad Concepts / Areas Expected to be Applied", "Role"]
data_fci = [
    ["1", "Operating Systems", "Process lifecycle management (child_process.spawn), multi-worker parallel scheduling, stdio stream piping, hermetic execution sandboxing, process signals and timeout handling", "Dominant"],
    ["2", "Data Structures and Algorithms", "Directed Acyclic Graphs (DAG), adjacency lists, Kahn's topological sort, in-degree arrays, cycle detection, reverse Breadth-First Search (BFS) impact traversal", "Dominant"],
    ["3", "System Programming / Software Tools", "Compiler toolchains (GCC/MinGW, Clang, CMake, Ninja), object file linking, AST/regex import extraction, Content-Addressable Storage (CAS), SHA-256 fingerprinting", "Dominant"],
    ["4", "Database Management Systems", "Relational schema design, entity constraints, foreign keys, build history records, execution logs, and persistent state management (Prisma / MySQL 8.0)", "Supporting"],
    ["5", "Computer Networks", "Git Smart HTTP protocol v2, packet-line (pkt-line) framing (stateless-rpc), streaming upload-pack/receive-pack over HTTP/S, TCP sockets for worker dispatch", "Supporting"],
    ["6", "Software Engineering", "Modular engine decomposition (E1–E4), sprint-based delivery, manifest contract validation, test harnesses for cache consistency and cycle fault injection", "Supporting"]
]
create_table(doc, headers_fci, data_fci, [0.6, 1.8, 3.6, 0.8])

# 4. Conceptual Workflow / System View
h4 = doc.add_heading("4. Conceptual Workflow / System View", level=2)
h4.paragraph_format.space_before = Pt(4)
h4.paragraph_format.space_after = Pt(4)
for run in h4.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

add_placeholder_box(doc, "PASTE / DRAW CONCEPTUAL WORKFLOW DIAGRAM HERE (Developer -> Manifest/Scan -> DAG -> BFS Impact -> Kahn Sort -> CAS Cache -> Execution -> Report)")

# Page Break for Scope & Feasibility
doc.add_page_break()

# Section 3: Header Banner
add_header_banner(doc, "SCOPE & FEASIBILITY", "Gate 0 - Themes 1-5")

# 5. Broad Project Scope
h5 = doc.add_heading("5. Broad Project Scope", level=2)
h5.paragraph_format.space_before = Pt(4)
h5.paragraph_format.space_after = Pt(4)
for run in h5.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

doc.add_heading("5.1 Broadly In Scope", level=3)
headers_in = ["#", "Broad In-Scope Item"]
data_in = [
    ["1", "SHA-256 cryptographic fingerprinting and delta change detection (added, modified, deleted) against baseline commits."],
    ["2", "Multi-language dependency resolution (C/C++, TS/JS, Python) to build in-memory DAGs and visualize them via ReactFlow."],
    ["3", "Impact analysis using reverse BFS traversal to flag direct and transitive dependents needing recompilation."],
    ["4", "Kahn's topological sort with cycle detection and independent parallel wave batching."],
    ["5", "Content-Addressable Storage (CAS) caching of compiled object binaries to guarantee zero-rebuild on cache hits."],
    ["6", "Multi-worker parallel execution scheduler (1, 2, 4, 8 cores) with live stdio streaming and run manager."]
]
create_table(doc, headers_in, data_in, [0.6, 6.2])

doc.add_heading("5.2 Out of Scope", level=3)
headers_out = ["#", "Out-of-Scope Item", "Reason"]
data_out = [
    ["1", "Full distributed cluster build farm across multiple cloud nodes", "Targeted for single-machine multi-core worker scheduling within the 3-credit course scope; remote networked workers remain an optional extension."],
    ["2", "Proprietary binary disassemblers and binary instrumentation", "Focus is on source-level AST/regex dependency resolution and standard compiler toolchains (GCC, Clang, CMake, Node, Python)."],
    ["3", "Automated syntax error auto-correction", "The engine builds, schedules, caches, and reports compilation outputs hermetically; correcting syntax errors is the developer's responsibility."]
]
create_table(doc, headers_out, data_out, [0.5, 2.5, 3.8])

# 6. Feasibility & Constraints
h6 = doc.add_heading("6. Feasibility & Constraints", level=2)
h6.paragraph_format.space_before = Pt(6)
h6.paragraph_format.space_after = Pt(4)
for run in h6.runs:
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

headers_feas = ["Aspect", "Feasibility / Constraint Details"]
data_feas = [
    ["Feasibility within 3-credit scope", "Highly feasible with bounded scope: focuses on core compiler integration (C/C++, Node.js, Python), local bare-Git repository access, parallel worker scheduling, and CAS caching on a standard workstation."],
    ["Required computing / resources", "Standard student PC/laptop with 8+ GB RAM, multi-core CPU, Windows/Linux OS; MinGW-w64 GCC, Node.js 20+, MySQL 8.0, and standard browser environment."],
    ["Prerequisite knowledge", "Data Structures & Algorithms (DAGs, Kahn's algorithm, BFS, hash maps), Operating Systems (process creation, streams, concurrency), Systems Programming (compilers, object linking, SHA-256), and Full-Stack Web Development."],
    ["Major constraints / limitations", "System resource limits on parallel worker concurrency; multi-language AST edge cases with dynamically constructed include paths; handling circular dependency deadlocks gracefully."],
    ["Use of existing libraries / tools", "Libraries used for web serving (Express), UI rendering (React, ReactFlow, Monaco), and database ORM (Prisma). Core engine algorithms (SHA-256 delta scanning, AST analyzers, reverse BFS impact analysis, Kahn's topological sort, CAS cache hashing, parallel worker scheduling) are implemented directly by the students."],
    ["Overall feasibility", "Feasible and Proven Functional"]
]
create_table(doc, headers_feas, data_feas, [2.3, 4.5])

output_file = r"D:\GITFORGE\gitforge\docs\GATE_0_PROJECT_SYNOPSIS_TEAM_1.docx"
doc.save(output_file)
print("Successfully created synopsis docx at:", output_file)

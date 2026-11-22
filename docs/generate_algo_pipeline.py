import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_algorithmic_pipeline():
    fig, ax = plt.subplots(figsize=(20, 11), dpi=300)
    ax.set_facecolor('#0B0F19')
    fig.patch.set_facecolor('#0B0F19')

    # Title Banner
    ax.text(10.0, 10.45, "GitForge — Algorithmic Processing Pipeline & Control Flow Logic", 
            color='white', fontsize=18, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')
    ax.text(10.0, 10.12, "Mathematical & Computational Lifecycle: Fingerprinting -> Graph AST -> Reverse BFS -> Kahn's Sort -> CAS Caching -> Parallel Execution", 
            color='#94A3B8', fontsize=10.5, ha='center', va='center', fontfamily='sans-serif')

    def draw_stage(x, y, w, h, stage_num, title, algorithm, complexity, details, border_col, header_bg):
        # Header Box
        hdr = patches.FancyBboxPatch((x, y + h - 0.75), w, 0.75, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     edgecolor=border_col, facecolor=header_bg, linewidth=1.5)
        ax.add_patch(hdr)
        ax.text(x + w/2, y + h - 0.26, f"STAGE {stage_num}: {title}", color='white', fontsize=10, fontweight='bold', ha='center', va='center')
        ax.text(x + w/2, y + h - 0.54, f"Algorithm: {algorithm} | Complexity: {complexity}", color='#E0E7FF', fontsize=7.8, ha='center', va='center')

        # Body Box
        body = patches.FancyBboxPatch((x, y), w, h - 0.75, boxstyle="round,pad=0.02,rounding_size=0.08",
                                      edgecolor=border_col, facecolor='#131D31', linewidth=1.2)
        ax.add_patch(body)

        # Content bullets
        curr_y = y + h - 1.05
        for item in details:
            ax.text(x + 0.15, curr_y, item, color='#CBD5E1', fontsize=8.0, va='center', fontfamily='monospace')
            curr_y -= 0.26

    # 6 Major Algorithmic Stages
    # STAGE 1: Content Fingerprinting & Delta Change Detection
    s1_details = [
        "1. Stream file bytes into SHA-256",
        "   H = crypto.createHash('sha256')",
        "2. Compare against baseline commit",
        "3. Δ = {added, modified, deleted}",
        "4. Filter out untouched files",
        "   (Immune to false mtime touches)"
    ]
    draw_stage(0.6, 5.7, 5.8, 3.8, "1", "Change Detection", "SHA-256 Fingerprinting", "O(N * FileSize)", s1_details, "#10B981", "#047857")

    # STAGE 2: Dependency Graph Construction
    s2_details = [
        "1. Multi-language AST / Regex parsing",
        "   - C/C++: #include <...> / \"...\"",
        "   - TS/JS: import / require(...)",
        "   - Python: import / from ...",
        "2. Resolve specifiers to file paths",
        "3. Construct in-memory DAG (V, E)",
        "   Edge: A -> B (A depends on B)"
    ]
    draw_stage(7.1, 5.7, 5.8, 3.8, "2", "Graph Generation", "AST / Regex Import Parsing", "O(V + E)", s2_details, "#3B82F6", "#1D4ED8")

    # STAGE 3: Reverse BFS Impact Analysis
    s3_details = [
        "1. Invert DAG to build reverse lookup:",
        "   R[target] = {sources depending on it}",
        "2. Initialize queue with delta changes Δ",
        "3. Traverse reverse dependencies BFS:",
        "   Direct (1-hop) & Transitive (2+ hops)",
        "4. Categorize all impacted files",
        "5. Leave unaffected files safe for CAS"
    ]
    draw_stage(13.6, 5.7, 5.8, 3.8, "3", "Impact Analysis", "Reverse BFS Traversal", "O(V + E)", s3_details, "#8B5CF6", "#6D28D9")

    # STAGE 4: Kahn's Topological Sort & Cycle Detection
    s4_details = [
        "1. Calculate in-degrees for each target",
        "   inDegree[T] = incoming prereqs",
        "2. Enqueue all targets with inDegree == 0",
        "3. Process queue, decrementing degrees",
        "4. If sorted.length != |V| -> CYCLE!",
        "   Halt & isolate cycle node list",
        "5. Else return linear valid build order"
    ]
    draw_stage(0.6, 1.2, 5.8, 3.8, "4", "Build Planner", "Kahn's Topological Sort", "O(V + E)", s4_details, "#EC4899", "#BE185D")

    # STAGE 5: CAS Caching & Action Key Hashing
    s5_details = [
        "1. For each target in topological order:",
        "   ActionKey = SHA256(inputs + cmd + flags)",
        "2. Lookup ActionKey in CAS index",
        "3. If Hit & CAS artifact valid:",
        "   -> Mark CACHED (0ms, 0 CPU cycles)",
        "4. Else -> Enqueue for compilation",
        "5. Prevents rebuilding unaffected targets"
    ]
    draw_stage(7.1, 1.2, 5.8, 3.8, "5", "Hermetic Caching", "Content-Addressable Storage", "O(1) Hash Lookup", s5_details, "#F59E0B", "#B45309")

    # STAGE 6: Parallel Execution Scheduler
    s6_details = [
        "1. Partition sorted targets into batches",
        "   Independent wave targets run in parallel",
        "2. Dispatch across worker pool (1/2/4/8 cores)",
        "3. child_process.spawn() with piped stdio",
        "4. If Exit Code == 0 -> Commit to CAS",
        "5. If Exit Code != 0 -> Fail & Halt dependents",
        "6. Stream live logs to browser terminal"
    ]
    draw_stage(13.6, 1.2, 5.8, 3.8, "6", "Parallel Execution", "Multi-Core Worker Scheduler", "O(Tasks / Cores)", s6_details, "#06B6D4", "#0E7490")

    # Draw Stage Flow Connectors
    def connect_stages(x1, y1, x2, y2, label=""):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color='#F8FAFC', lw=2.2, connectionstyle="arc3,rad=0.0"))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx, my + 0.15, label, color='#FBBF24', fontsize=8.0, fontweight='bold', ha='center', va='center',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor='#1E293B', edgecolor='#475569', lw=1.0))

    # Stage 1 -> 2
    connect_stages(6.4, 7.6, 7.1, 7.6, "Delta Δ")
    # Stage 2 -> 3
    connect_stages(12.9, 7.6, 13.6, 7.6, "DAG (V,E)")
    # Stage 3 -> 4 (Connecting from top right down to bottom left)
    ax.annotate('', xy=(6.4, 3.1), xytext=(16.5, 5.7),
                arrowprops=dict(arrowstyle="->", color='#F8FAFC', lw=2.2, connectionstyle="arc3,rad=-0.25"))
    ax.text(11.5, 4.4, "Affected Target Set (Direct + Transitive)", color='#FBBF24', fontsize=8.2, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.2", facecolor='#1E293B', edgecolor='#475569', lw=1.0))

    # Stage 4 -> 5
    connect_stages(6.4, 3.1, 7.1, 3.1, "Topological Waves")
    # Stage 5 -> 6
    connect_stages(12.9, 3.1, 13.6, 3.1, "Cache Misses")

    # Bottom Decision / Control Flow Logic Callout
    callout = patches.FancyBboxPatch((0.6, 0.2), 18.8, 0.75, boxstyle="round,pad=0.02,rounding_size=0.06",
                                     edgecolor='#64748B', facecolor='#1E293B', linewidth=1.0)
    ax.add_patch(callout)
    ax.text(1.0, 0.57, "Key Algorithmic Guarantees:", color='#38BDF8', fontsize=8.5, fontweight='bold', va='center')
    ax.text(5.0, 0.57, "• Deterministic Cache Keys: SHA-256(Inputs + CLI Args + Env)", color='#E2E8F0', fontsize=8.0, va='center')
    ax.text(10.5, 0.57, "• Zero Cycle Deadlocks: Kahn's Queue aborts with cycleNodes before compile", color='#E2E8F0', fontsize=8.0, va='center')
    ax.text(1.0, 0.35, "• Reverse Impact Minimization: Only affected transitive closure executes", color='#E2E8F0', fontsize=8.0, va='center')
    ax.text(10.5, 0.35, "• Hermetic Action Isolation: Broken builds never corrupt CAS or update accepted state", color='#E2E8F0', fontsize=8.0, va='center')

    ax.set_xlim(0, 20)
    ax.set_ylim(0, 11)
    ax.axis('off')
    plt.tight_layout()

    out_path = r"D:\GITFORGE\gitforge\docs\GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION\diagrams\gitforge_algorithmic_pipeline.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    print("Algorithmic pipeline diagram generated at:", out_path)

if __name__ == '__main__':
    draw_algorithmic_pipeline()

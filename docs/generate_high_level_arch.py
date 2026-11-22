import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_high_level_architecture():
    fig, ax = plt.subplots(figsize=(19, 11), dpi=300)
    ax.set_facecolor('#0B0F19')
    fig.patch.set_facecolor('#0B0F19')

    # Top Title Banner
    ax.text(9.5, 10.45, "GitForge — High-Level System Architecture & Component Interaction", 
            color='white', fontsize=18, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')
    ax.text(9.5, 10.12, "Enterprise Code Hosting Platform with Incremental Build & Dependency Resolution Engine", 
            color='#94A3B8', fontsize=10.5, ha='center', va='center', fontfamily='sans-serif')

    def draw_container(x, y, w, h, title, subtitle="", border_color="#3B82F6", fill_color="#111827"):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.03,rounding_size=0.12",
                                      edgecolor=border_color, facecolor=fill_color, linewidth=1.8)
        ax.add_patch(rect)
        ax.text(x + 0.3, y + h - 0.28, title, color='white', fontsize=11, fontweight='bold', va='center')
        if subtitle:
            ax.text(x + w - 0.3, y + h - 0.28, subtitle, color='#94A3B8', fontsize=8.5, ha='right', va='center')

    def draw_component(x, y, w, h, name, desc="", color="#1E293B", text_col="#E2E8F0", border_col="#475569"):
        card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     edgecolor=border_col, facecolor=color, linewidth=1.2)
        ax.add_patch(card)
        ax.text(x + w/2, y + h/2 + (0.12 if desc else 0), name, color=text_col, fontsize=9.5, fontweight='bold', ha='center', va='center')
        if desc:
            ax.text(x + w/2, y + h/2 - 0.16, desc, color='#94A3B8', fontsize=7.5, ha='center', va='center')

    # 1. LAYER 1: CLIENT LAYER (TOP)
    draw_container(0.8, 8.0, 17.4, 1.8, "1. Client & Presentation Layer", "React 18 + Vite + Tailwind CSS", "#3B82F6", "#0F172A")
    draw_component(1.1, 8.2, 3.8, 1.1, "Web UI Dashboard", "Repository, PRs, Issues, Explorer", "#1E293B", "#60A5FA", "#3B82F6")
    draw_component(5.3, 8.2, 3.8, 1.1, "Monaco Code Browser", "Syntax Highlighting & In-Browser IDE", "#1E293B", "#38BDF8", "#0284C7")
    draw_component(9.5, 8.2, 4.2, 1.1, "Interactive Visual DAG", "Force-Directed ReactFlow Graph Canvas", "#1E293B", "#A78BFA", "#8B5CF6")
    draw_component(14.1, 8.2, 3.8, 1.1, "Terminal Run Manager", "Real-Time Stdin/Stdout Streaming UI", "#1E293B", "#34D399", "#10B981")

    # 2. LAYER 2: NETWORK & PROTOCOL BRIDGE
    draw_container(0.8, 6.2, 17.4, 1.3, "2. Network & Transport Gateway", "HTTP 1.1 / REST / Git Smart HTTP RPC", "#6366F1", "#0F172A")
    draw_component(1.1, 6.4, 5.2, 0.75, "REST API Gateway (/api/*)", "JWT Auth & JSON Payloads", "#1E293B", "#818CF8", "#6366F1")
    draw_component(6.8, 6.4, 5.4, 0.75, "Git Smart HTTP Interceptor", "pkt-line Streaming (upload-pack / receive-pack)", "#1E293B", "#F472B6", "#EC4899")
    draw_component(12.7, 6.4, 5.2, 0.75, "Terminal Stdio WebSocket/SSE", "Bidirectional Process Piping Gateway", "#1E293B", "#FBBF24", "#F59E0B")

    # 3. LAYER 3: CORE BACKEND & ENGINES (MIDDLE)
    draw_container(0.8, 2.7, 12.0, 3.0, "3. GitForge Core Engine Subsystems", "Node.js 20+ / Express & TypeScript Engine", "#10B981", "#0F172A")
    
    # E1
    draw_component(1.1, 4.25, 5.6, 1.0, "E1: Change Detection & Adapters", "SHA-256 Fingerprinting, Manifest & Adapters", "#1E293B", "#34D399", "#10B981")
    # E2
    draw_component(7.0, 4.25, 5.5, 1.0, "E2: Dependency & Impact Analysis", "AST Import Parsing, BFS Impact & Kahn Sort", "#1E293B", "#60A5FA", "#2563EB")
    # E3
    draw_component(1.1, 2.95, 5.6, 1.0, "E3: Execution, CAS & Scheduler", "Parallel Pool (1/2/4/8 cores), CAS Object Store", "#1E293B", "#F87171", "#EF4444")
    # E4
    draw_component(7.0, 2.95, 5.5, 1.0, "E4: Bare Git Host & Worker Dispatch", "Safe Subprocess Runner & Smart HTTP Server", "#1E293B", "#FB923C", "#F97316")

    # 4. LAYER 4: STORAGE & TOOLCHAINS (RIGHT SIDE)
    draw_container(13.2, 2.7, 5.0, 3.0, "4. Storage & Toolchains", "Persistent State & Toolchain", "#EAB308", "#0F172A")
    draw_component(13.5, 4.75, 4.4, 0.65, "MySQL 8.0 Database", "Prisma ORM (Users, Repos, PRs, Logs)", "#1E293B", "#FCD34D", "#EAB308")
    draw_component(13.5, 3.95, 4.4, 0.65, "Bare Git Repositories", "data/repos/{user}/{repo}.git", "#1E293B", "#F472B6", "#DB2777")
    draw_component(13.5, 3.15, 4.4, 0.65, "CAS Cache & Compiler Chain", "data/build-cache/ & MinGW GCC/Clang", "#1E293B", "#38BDF8", "#0284C7")

    # 5. LAYER 5: INTERACTION & PIPELINE FLOW (BOTTOM BANNER)
    draw_container(0.8, 0.6, 17.4, 1.6, "5. End-to-End Component Interaction Flow", "Execution Pipeline", "#EC4899", "#0F172A")
    
    stages = [
        ("Step 1: Code Push", "Developer push / Web edit", "#60A5FA"),
        ("Step 2: Manifest & Scan", "E1 hashes files with SHA-256", "#34D399"),
        ("Step 3: DAG & Impact", "E2 parses AST & runs BFS", "#818CF8"),
        ("Step 4: Kahn's Sort", "E2 creates execution batches", "#F472B6"),
        ("Step 5: CAS Lookup", "E3 skips cached object hashes", "#FBBF24"),
        ("Step 6: Worker Exec", "E3 parallel build & log stream", "#38BDF8")
    ]
    
    for idx, (stg_name, stg_desc, stg_col) in enumerate(stages):
        sx = 1.1 + idx * 2.85
        draw_component(sx, 0.8, 2.7, 1.05, stg_name, stg_desc, "#1E293B", stg_col, stg_col)
        if idx < len(stages) - 1:
            ax.annotate('', xy=(sx + 2.82, 1.32), xytext=(sx + 2.7, 1.32),
                        arrowprops=dict(arrowstyle="->", color='#94A3B8', lw=1.5))

    # Connection Lines between layers
    def connect_arrow(x1, y1, x2, y2, color="#64748B", style="->", rad=0.0):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle=style, color=color, lw=1.6, 
                                   connectionstyle=f"arc3,rad={rad}"))

    # Client -> Network
    connect_arrow(3.0, 8.0, 3.0, 7.5, "#38BDF8")
    connect_arrow(7.2, 8.0, 7.2, 7.5, "#EC4899")
    connect_arrow(14.5, 8.0, 14.5, 7.5, "#FBBF24")

    # Network -> Backend Engines
    connect_arrow(3.7, 6.2, 3.7, 5.7, "#60A5FA")
    connect_arrow(9.5, 6.2, 9.5, 5.7, "#EC4899")

    # Backend Engines -> Storage
    connect_arrow(12.8, 4.75, 13.5, 5.05, "#EAB308", "<->")
    connect_arrow(12.8, 3.45, 13.5, 4.25, "#F472B6", "<->")
    connect_arrow(6.7, 3.45, 13.5, 3.45, "#38BDF8", "<->")

    # Backend Inter-Engine arrows
    connect_arrow(6.7, 4.75, 7.0, 4.75, "#10B981") # E1 -> E2
    connect_arrow(9.75, 4.25, 3.9, 3.95, "#2563EB", "->", rad=-0.1) # E2 -> E3
    connect_arrow(6.7, 3.45, 7.0, 3.45, "#EF4444", "<->") # E3 <-> E4

    ax.set_xlim(0, 19)
    ax.set_ylim(0, 11)
    ax.axis('off')
    plt.tight_layout()

    out_path = r"D:\GITFORGE\gitforge\docs\GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION\diagrams\gitforge_high_level_architecture.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    print("High-level architecture diagram generated at:", out_path)

if __name__ == '__main__':
    draw_high_level_architecture()

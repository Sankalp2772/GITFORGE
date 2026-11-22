import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_security_architecture():
    fig, ax = plt.subplots(figsize=(20, 11), dpi=300)
    ax.set_facecolor('#0B0F19')
    fig.patch.set_facecolor('#0B0F19')

    # Title Banner
    ax.text(10.0, 10.45, "GitForge — Security Architecture, RBAC & Trust Boundaries", 
            color='white', fontsize=18, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')
    ax.text(10.0, 10.12, "Multi-Zone Defense-in-Depth: Authentication, RBAC Matrix, Subprocess Sandboxing & Cryptographic Integrity", 
            color='#94A3B8', fontsize=10.5, ha='center', va='center', fontfamily='sans-serif')

    def draw_zone(x, y, w, h, zone_name, trust_level, border_col, fill_col):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.03,rounding_size=0.12",
                                      edgecolor=border_col, facecolor=fill_col, linewidth=2.0, linestyle="--")
        ax.add_patch(rect)
        ax.text(x + 0.3, y + h - 0.28, zone_name, color='white', fontsize=11, fontweight='bold', va='center')
        ax.text(x + w - 0.3, y + h - 0.28, f"Trust Level: {trust_level}", color='#94A3B8', fontsize=8.5, ha='right', va='center')

    def draw_card(x, y, w, h, title, items, header_col="#1E293B", text_col="#E2E8F0", border_col="#475569"):
        card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     edgecolor=border_col, facecolor="#131D31", linewidth=1.2)
        ax.add_patch(card)
        hdr = patches.FancyBboxPatch((x, y + h - 0.48), w, 0.48, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     edgecolor=border_col, facecolor=header_col, linewidth=1.2)
        ax.add_patch(hdr)
        ax.text(x + w/2, y + h - 0.24, title, color='white', fontsize=9.2, fontweight='bold', ha='center', va='center')
        
        curr_y = y + h - 0.75
        for item in items:
            ax.text(x + 0.15, curr_y, item, color=text_col, fontsize=7.8, va='center', fontfamily='monospace')
            curr_y -= 0.25

    # 1. ZONE 1: UNTRUSTED / EXTERNAL ACTORS (LEFT)
    draw_zone(0.6, 5.2, 5.4, 4.4, "ZONE 1: Untrusted External Clients", "Zero Trust (Public)", "#EF4444", "#18131E")
    draw_card(0.8, 7.3, 5.0, 2.0, "Web Browser Clients", [
        "• React SPA on port 5174",
        "• Form logins & interactive sessions",
        "• Potentially malicious user payloads",
        "• Susceptible to XSS, CSRF if unguarded"
    ], "#991B1B", "#FCA5A5", "#EF4444")

    draw_card(0.8, 5.4, 5.0, 1.7, "Standard Git CLI Clients", [
        "• Git CLI over HTTP (git clone / push)",
        "• Basic Auth headers (base64 user:pass)",
        "• Packfile chunk streams (stateless-rpc)"
    ], "#991B1B", "#FCA5A5", "#EF4444")

    # 2. ZONE 2: DMZ & AUTH GATEWAY (MIDDLE LEFT)
    draw_zone(6.4, 5.2, 6.2, 4.4, "ZONE 2: Authentication & Gateway Boundary", "Verified Per-Request", "#F59E0B", "#1C1917")
    draw_card(6.6, 7.3, 5.8, 2.0, "Auth Middleware & Token Gate", [
        "• JWT Verification (RS256/HS256 signed)",
        "• bcrypt Password Salting & Hashing (10 rounds)",
        "• Authorization: Bearer <token> validation",
        "• Strict Rate Limiting & Input Sanitization"
    ], "#B45309", "#FDE68A", "#F59E0B")

    draw_card(6.6, 5.4, 5.8, 1.7, "Git Smart HTTP Interceptor", [
        "• Intercepts /:owner/:repo.git routes",
        "• Validates Basic Auth credentials against DB",
        "• Blocks anonymous push to private repos"
    ], "#B45309", "#FDE68A", "#F59E0B")

    # 3. ZONE 3: TRUSTED INTERNAL CORE (MIDDLE RIGHT)
    draw_zone(13.0, 5.2, 6.4, 4.4, "ZONE 3: Core Service & Execution Isolation", "High Trust / Sandboxed", "#10B981", "#0F201C")
    draw_card(13.2, 7.3, 6.0, 2.0, "Subprocess Execution Sandbox", [
        "• child_process.spawn() array arguments",
        "• Zero shell execution (avoids shell injection)",
        "• Blocks chained commands (;, |, &&, `, $)",
        "• Path traversal guards (blocks ../ escapes)"
    ], "#047857", "#A7F3D0", "#10B981")

    draw_card(13.2, 5.4, 6.0, 1.7, "CAS Cache Integrity Guard", [
        "• Cryptographic SHA-256 verification",
        "• Read-only materialized cache artifacts",
        "• Rejects corrupted or partial object blobs"
    ], "#047857", "#A7F3D0", "#10B981")

    # 4. BOTTOM SECTION: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
    draw_zone(0.6, 0.8, 18.8, 4.0, "Role-Based Access Control (RBAC) Permission Matrix", "Enforced at API & Git RPC Layers", "#3B82F6", "#0F172A")

    # RBAC Table headers
    headers = ["Repository Role", "Clone / Read (Public)", "Clone / Read (Private)", "Git Push (Write)", "Manage PRs / Issues", "Admin & Member Invites", "Delete Repository"]
    x_positions = [0.9, 3.8, 6.5, 9.2, 11.9, 14.6, 17.3]
    y_hdr = 4.15

    for idx, (h, xp) in enumerate(zip(headers, x_positions)):
        w_col = 2.4 if idx > 0 else 2.6
        box = patches.FancyBboxPatch((xp, y_hdr), w_col, 0.42, boxstyle="round,pad=0.02,rounding_size=0.06",
                                     edgecolor='#3B82F6', facecolor='#1E293B', linewidth=1.0)
        ax.add_patch(box)
        ax.text(xp + w_col/2, y_hdr + 0.21, h, color='white', fontsize=8.0, fontweight='bold', ha='center', va='center')

    # RBAC Matrix rows
    roles_data = [
        ("OWNER", ["Allowed", "Allowed", "Allowed", "Allowed", "Allowed", "Allowed (Full Control)"], "#818CF8", "#059669"),
        ("ADMIN", ["Allowed", "Allowed", "Allowed", "Allowed", "Allowed", "Denied (Owner Only)"], "#38BDF8", "#059669"),
        ("WRITE", ["Allowed", "Allowed", "Allowed", "Allowed", "Denied", "Denied"], "#34D399", "#D97706"),
        ("READ",  ["Allowed", "Allowed", "Denied", "View Only", "Denied", "Denied"], "#FBBF24", "#DC2626"),
        ("ANONYMOUS", ["Allowed", "Denied", "Denied", "Denied", "Denied", "Denied"], "#94A3B8", "#475569")
    ]

    curr_row_y = 3.55
    for role_name, perms, role_col, status_col in roles_data:
        # Role Cell
        r_box = patches.FancyBboxPatch((0.9, curr_row_y), 2.6, 0.45, boxstyle="round,pad=0.02,rounding_size=0.06",
                                       edgecolor=role_col, facecolor='#1E293B', linewidth=1.2)
        ax.add_patch(r_box)
        ax.text(2.2, curr_row_y + 0.22, role_name, color=role_col, fontsize=8.8, fontweight='bold', ha='center', va='center')

        # Permission cells
        for idx, (p_text, xp) in enumerate(zip(perms, x_positions[1:])):
            is_allow = "Allowed" in p_text
            is_deny = "Denied" in p_text
            bg_col = "#064E3B" if is_allow else ("#450A0A" if is_deny else "#1E293B")
            fg_col = "#6EE7B7" if is_allow else ("#FCA5A5" if is_deny else "#FBBF24")
            
            p_box = patches.FancyBboxPatch((xp, curr_row_y), 2.4, 0.45, boxstyle="round,pad=0.02,rounding_size=0.06",
                                           edgecolor='#334155', facecolor=bg_col, linewidth=0.8)
            ax.add_patch(p_box)
            ax.text(xp + 1.2, curr_row_y + 0.22, p_text, color=fg_col, fontsize=7.8, fontweight='bold', ha='center', va='center')
        
        curr_row_y -= 0.55

    # Boundary Trust Crossing Arrows
    def draw_boundary_arrow(x1, y1, x2, y2, label=""):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color='#F59E0B', lw=2.0))
        if label:
            ax.text((x1+x2)/2, (y1+y2)/2 + 0.15, label, color='#FCD34D', fontsize=7.8, fontweight='bold', ha='center', va='center',
                    bbox=dict(boxstyle="round,pad=0.15", facecolor='#1E293B', edgecolor='#475569', lw=0.8))

    draw_boundary_arrow(5.8, 8.3, 6.4, 8.3, "JWT Bearer")
    draw_boundary_arrow(5.8, 6.2, 6.4, 6.2, "Basic Auth")
    draw_boundary_arrow(12.4, 7.3, 13.0, 7.3, "RBAC OK")

    ax.set_xlim(0, 20)
    ax.set_ylim(0, 11)
    ax.axis('off')
    plt.tight_layout()

    out_path = r"D:\GITFORGE\gitforge\docs\GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION\diagrams\gitforge_security_rbac_architecture.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    print("Security & RBAC diagram generated at:", out_path)

if __name__ == '__main__':
    draw_security_architecture()

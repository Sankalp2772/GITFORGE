import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_er_diagram():
    fig, ax = plt.subplots(figsize=(19, 11), dpi=300)
    ax.set_facecolor('#0F172A') # Dark background
    fig.patch.set_facecolor('#0F172A')

    # Title
    ax.text(9.5, 10.5, "GitForge — Complete Data Design & Entity Relationship (ER) Diagram", 
            color='white', fontsize=18, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')
    ax.text(9.5, 10.15, "Relational MySQL Entities (Prisma ORM) & Content-Addressable Storage (CAS) Schema", 
            color='#94A3B8', fontsize=11, ha='center', va='center', fontfamily='sans-serif')

    def draw_entity(x, y, w, h, title, fields, color='#3B82F6'):
        # Header box
        hdr = patches.FancyBboxPatch((x, y + h - 0.55), w, 0.55, boxstyle="round,pad=0.02,rounding_size=0.08",
                                     edgecolor=color, facecolor=color, linewidth=1.5)
        ax.add_patch(hdr)
        ax.text(x + w/2, y + h - 0.28, title, color='white', fontsize=10.5, fontweight='bold', ha='center', va='center')

        # Body box
        body = patches.FancyBboxPatch((x, y), w, h - 0.55, boxstyle="round,pad=0.02,rounding_size=0.08",
                                      edgecolor=color, facecolor='#1E293B', linewidth=1.2)
        ax.add_patch(body)

        # Field items
        curr_y = y + h - 0.85
        for f in fields:
            is_pk = "(PK)" in f
            is_fk = "(FK)" in f
            col = '#38BDF8' if is_pk else ('#FBBF24' if is_fk else '#E2E8F0')
            weight = 'bold' if (is_pk or is_fk) else 'normal'
            ax.text(x + 0.15, curr_y, f, color=col, fontsize=8.2, fontweight=weight, va='center', fontfamily='monospace')
            curr_y -= 0.28

    # Row 1: Core User & Auth
    draw_entity(0.8, 6.2, 3.4, 3.4, "User", [
        "id: String (PK)",
        "username: String (UQ)",
        "email: String (UQ)",
        "passwordHash: String",
        "avatar: String?",
        "bio: String?",
        "createdAt: DateTime",
        "updatedAt: DateTime"
    ], color='#6366F1')

    draw_entity(5.2, 6.2, 3.6, 3.4, "Repository", [
        "id: String (PK)",
        "name: String",
        "ownerId: String (FK)",
        "visibility: Visibility",
        "defaultBranch: String",
        "storagePath: String",
        "createdAt: DateTime",
        "updatedAt: DateTime"
    ], color='#0EA5E9')

    draw_entity(9.8, 6.7, 3.8, 2.9, "RepositoryMember", [
        "id: String (PK)",
        "repositoryId: String (FK)",
        "userId: String (FK)",
        "role: MemberRole",
        "joinedAt: DateTime"
    ], color='#10B981')

    draw_entity(14.4, 6.7, 3.8, 2.9, "RepositoryInvitation", [
        "id: String (PK)",
        "repositoryId: String (FK)",
        "invitedUserId: String (FK)",
        "invitedById: String (FK)",
        "role: MemberRole",
        "status: InvitationStatus"
    ], color='#14B8A6')

    # Row 2: Code, PRs & Issues
    draw_entity(0.8, 1.8, 3.4, 3.2, "Branch", [
        "id: String (PK)",
        "repositoryId: String (FK)",
        "name: String",
        "commitSha: String",
        "isDefault: Boolean",
        "createdAt: DateTime"
    ], color='#8B5CF6')

    draw_entity(5.2, 1.4, 3.6, 3.8, "PullRequest", [
        "id: String (PK)",
        "number: Int",
        "repositoryId: String (FK)",
        "authorId: String (FK)",
        "sourceBranch: String",
        "targetBranch: String",
        "title: String",
        "status: PRStatus",
        "mergedAt: DateTime?"
    ], color='#EC4899')

    draw_entity(9.8, 1.6, 3.8, 3.5, "Issue", [
        "id: String (PK)",
        "number: Int",
        "repositoryId: String (FK)",
        "authorId: String (FK)",
        "assigneeId: String? (FK)",
        "title: String",
        "status: IssueStatus",
        "closedAt: DateTime?"
    ], color='#F59E0B')

    draw_entity(14.4, 1.6, 3.8, 3.5, "BuildHistory & CAS", [
        "id: String (PK)",
        "repositoryId: String (FK)",
        "commitSha: String",
        "actionKey: String (SHA-256)",
        "status: ActionState",
        "casArtifactDigest: String",
        "durationMs: Int",
        "cacheHit: Boolean"
    ], color='#EF4444')

    # Draw Relation Arrows
    def draw_rel(x1, y1, x2, y2, label=""):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color='#94A3B8', lw=1.5, connectionstyle="arc3,rad=0.05"))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx, my + 0.12, label, color='#CBD5E1', fontsize=7.5, fontweight='bold', ha='center', va='center',
                    bbox=dict(boxstyle="round,pad=0.15", facecolor='#1E293B', edgecolor='#475569', lw=0.8))

    # User -> Repo (1 to Many)
    draw_rel(4.2, 7.9, 5.2, 7.9, "1 : N (owns)")
    # Repo -> RepoMember (1 to Many)
    draw_rel(8.8, 8.0, 9.8, 8.0, "1 : N")
    # User -> RepoMember
    draw_rel(2.5, 6.2, 10.5, 6.7, "1 : N (member)")
    # Repo -> RepoInvitation
    draw_rel(8.8, 8.8, 14.4, 8.5, "1 : N")
    # Repo -> Branch
    draw_rel(6.0, 6.2, 3.0, 5.0, "1 : N")
    # Repo -> PullRequest
    draw_rel(6.5, 6.2, 6.5, 5.2, "1 : N")
    # User -> PullRequest
    draw_rel(2.8, 6.2, 5.2, 4.0, "1 : N (author)")
    # Repo -> Issue
    draw_rel(8.0, 6.2, 10.5, 5.1, "1 : N")
    # Repo -> BuildHistory
    draw_rel(8.5, 6.2, 15.0, 5.1, "1 : N (builds)")

    # Legend / Key Footer
    ax.text(1.0, 0.6, "Legend:", color='white', fontsize=9.5, fontweight='bold')
    ax.text(2.0, 0.6, "PK: Primary Key", color='#38BDF8', fontsize=8.5, fontweight='bold')
    ax.text(4.0, 0.6, "FK: Foreign Key", color='#FBBF24', fontsize=8.5, fontweight='bold')
    ax.text(6.0, 0.6, "UQ: Unique Field", color='#A78BFA', fontsize=8.5, fontweight='bold')
    ax.text(8.0, 0.6, "CAS: Content-Addressable Storage (SHA-256 Object Binaries)", color='#EF4444', fontsize=8.5, fontweight='bold')

    ax.set_xlim(0, 19)
    ax.set_ylim(0, 11)
    ax.axis('off')
    plt.tight_layout()
    
    out_path = r"D:\GITFORGE\gitforge\docs\GITFORGE_COMPLETE_TECHNICAL_DOCUMENTATION\diagrams\gitforge_data_design_er.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    print("ER Diagram generated at:", out_path)

if __name__ == '__main__':
    draw_er_diagram()

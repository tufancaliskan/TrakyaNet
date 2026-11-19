using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<ClassMember> ClassMembers => Set<ClassMember>();
    public DbSet<Club> Clubs => Set<Club>();
    public DbSet<ClubMember> ClubMembers => Set<ClubMember>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users", table =>
            {
                table.HasCheckConstraint("ck_users_name", "char_length(btrim(full_name)) between 1 and 80");
                table.HasCheckConstraint("ck_users_role", "system_role in ('student', 'teacher', 'admin')");
            });
            entity.Property(user => user.FullName).HasMaxLength(80).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(160).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(200).IsRequired();
            entity.Property(user => user.SystemRole).HasMaxLength(20).IsRequired();
            entity.Property(user => user.AvatarUrl).HasMaxLength(400);
            entity.HasIndex(user => user.Email).IsUnique();
        });

        modelBuilder.Entity<ClassRoom>(entity =>
        {
            entity.ToTable("classes", table =>
            {
                table.HasCheckConstraint("ck_classes_name", "char_length(btrim(name)) between 1 and 80");
                table.HasCheckConstraint("ck_classes_code", "code ~ '^[A-Z0-9]{6}$'");
            });
            entity.Property(item => item.Name).HasMaxLength(80).IsRequired();
            entity.Property(item => item.Code).HasMaxLength(6).IsRequired();
            entity.HasIndex(item => item.Code).IsUnique();
            entity.HasIndex(item => item.TeacherId);
            entity.HasOne(item => item.Teacher)
                .WithMany(user => user.ClassesTeaching)
                .HasForeignKey(item => item.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassMember>(entity =>
        {
            entity.ToTable("class_members");
            entity.HasKey(member => new { member.ClassId, member.UserId });
            entity.HasIndex(member => member.UserId);
            entity.HasOne(member => member.ClassRoom)
                .WithMany(item => item.Members)
                .HasForeignKey(member => member.ClassId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(member => member.User)
                .WithMany(user => user.ClassMemberships)
                .HasForeignKey(member => member.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Club>(entity =>
        {
            entity.ToTable("clubs", table =>
            {
                table.HasCheckConstraint("ck_clubs_name", "char_length(btrim(name)) between 1 and 80");
                table.HasCheckConstraint("ck_clubs_description", "char_length(description) <= 500");
            });
            entity.Property(club => club.Name).HasMaxLength(80).IsRequired();
            entity.Property(club => club.Description).HasMaxLength(500).IsRequired();
            entity.Property(club => club.LogoUrl).HasMaxLength(400);
            entity.HasIndex(club => club.CreatedBy);
            entity.HasOne(club => club.Creator)
                .WithMany(user => user.ClubsCreated)
                .HasForeignKey(club => club.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClubMember>(entity =>
        {
            entity.ToTable("club_members", table =>
            {
                table.HasCheckConstraint("ck_club_members_role", "role in ('member', 'admin')");
            });
            entity.HasKey(member => new { member.ClubId, member.UserId });
            entity.Property(member => member.Role).HasMaxLength(20).IsRequired();
            entity.HasIndex(member => member.UserId);
            entity.HasOne(member => member.Club)
                .WithMany(club => club.Members)
                .HasForeignKey(member => member.ClubId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(member => member.User)
                .WithMany(user => user.ClubMemberships)
                .HasForeignKey(member => member.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.ToTable("announcements", table =>
            {
                table.HasCheckConstraint("ck_announcements_title", "char_length(btrim(title)) between 1 and 160");
                table.HasCheckConstraint("ck_announcements_content", "char_length(btrim(content)) between 1 and 4000");
                table.HasCheckConstraint(
                    "ck_announcements_scope",
                    "scope_type in ('school', 'class', 'club') and ((scope_type = 'school' and scope_id is null) or (scope_type in ('class', 'club') and scope_id is not null))");
            });
            entity.Property(item => item.Title).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Content).HasMaxLength(4000).IsRequired();
            entity.Property(item => item.ScopeType).HasMaxLength(20).IsRequired();
            entity.HasIndex(item => new { item.ScopeType, item.ScopeId, item.CreatedAt });
            entity.HasIndex(item => item.AuthorId);
            entity.HasOne(item => item.Author)
                .WithMany(user => user.Announcements)
                .HasForeignKey(item => item.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.ToTable("assignments", table =>
            {
                table.HasCheckConstraint("ck_assignments_title", "char_length(btrim(title)) between 1 and 160");
                table.HasCheckConstraint("ck_assignments_description", "char_length(description) <= 4000");
            });
            entity.Property(item => item.Title).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(4000).IsRequired();
            entity.Property(item => item.FileUrl).HasMaxLength(400);
            entity.HasIndex(item => new { item.ClassId, item.DueDate });
            entity.HasIndex(item => item.CreatedBy);
            entity.HasOne(item => item.ClassRoom)
                .WithMany(classroom => classroom.Assignments)
                .HasForeignKey(item => item.ClassId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Creator)
                .WithMany(user => user.Assignments)
                .HasForeignKey(item => item.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages", table =>
            {
                table.HasCheckConstraint("ck_messages_content", "char_length(btrim(content)) between 1 and 2000");
                table.HasCheckConstraint(
                    "ck_messages_channel",
                    "channel_type in ('school', 'class', 'club') and ((channel_type = 'school' and channel_id is null) or (channel_type in ('class', 'club') and channel_id is not null))");
            });
            entity.Property(item => item.ChannelType).HasMaxLength(20).IsRequired();
            entity.Property(item => item.Content).HasMaxLength(2000).IsRequired();
            entity.HasIndex(item => new { item.ChannelType, item.ChannelId, item.CreatedAt });
            entity.HasIndex(item => item.SenderId);
            entity.HasOne(item => item.Sender)
                .WithMany(user => user.Messages)
                .HasForeignKey(item => item.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

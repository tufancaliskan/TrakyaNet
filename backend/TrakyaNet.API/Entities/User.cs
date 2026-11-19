namespace TrakyaNet.API.Entities;

public class User
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string SystemRole { get; set; } = "student";
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<ClassRoom> ClassesTeaching { get; set; } = new List<ClassRoom>();
    public ICollection<ClassMember> ClassMemberships { get; set; } = new List<ClassMember>();
    public ICollection<Club> ClubsCreated { get; set; } = new List<Club>();
    public ICollection<ClubMember> ClubMemberships { get; set; } = new List<ClubMember>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

namespace TrakyaNet.API.Entities;

public class Club
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<ClubMember> Members { get; set; } = new List<ClubMember>();
}

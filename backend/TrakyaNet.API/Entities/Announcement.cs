namespace TrakyaNet.API.Entities;

public class Announcement
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string ScopeType { get; set; } = string.Empty;
    public Guid? ScopeId { get; set; }
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
}

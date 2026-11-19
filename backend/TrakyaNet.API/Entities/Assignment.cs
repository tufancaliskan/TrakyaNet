namespace TrakyaNet.API.Entities;

public class Assignment
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public ClassRoom ClassRoom { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
}

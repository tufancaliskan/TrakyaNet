namespace TrakyaNet.API.Entities;

public class ClassMember
{
    public Guid ClassId { get; set; }
    public ClassRoom ClassRoom { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTimeOffset JoinedAt { get; set; }
}

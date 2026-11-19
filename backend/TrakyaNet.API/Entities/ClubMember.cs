namespace TrakyaNet.API.Entities;

public class ClubMember
{
    public Guid ClubId { get; set; }
    public Club Club { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Role { get; set; } = "member";
    public DateTimeOffset JoinedAt { get; set; }
}

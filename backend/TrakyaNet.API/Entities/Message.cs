namespace TrakyaNet.API.Entities;

public class Message
{
    public Guid Id { get; set; }
    public string ChannelType { get; set; } = string.Empty;
    public Guid? ChannelId { get; set; }
    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

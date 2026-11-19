namespace TrakyaNet.API.Entities;

public class ClassRoom
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<ClassMember> Members { get; set; } = new List<ClassMember>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

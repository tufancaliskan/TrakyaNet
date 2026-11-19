namespace TrakyaNet.API.DTOs;

public record UserResponse(
    Guid Id,
    string FullName,
    string Email,
    string? AvatarUrl,
    string SystemRole,
    DateTimeOffset CreatedAt);

public record UserSearchResponse(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    string SystemRole,
    DateTimeOffset CreatedAt);

public record AuthResponse(string Token, UserResponse User);

public record RegisterRequest(string FullName, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record UpdateProfileRequest(string FullName);

public record SetRoleRequest(string Role);

public record ClassResponse(
    Guid Id,
    string Name,
    string? Code,
    Guid TeacherId,
    string TeacherName,
    DateTimeOffset CreatedAt,
    int MemberCount,
    bool IsMember);

public record CreateClassRequest(string Name);

public record JoinClassRequest(string Code);

public record IdResponse(Guid Id);

public record ClubResponse(
    Guid Id,
    string Name,
    string Description,
    string? LogoUrl,
    Guid CreatedBy,
    DateTimeOffset CreatedAt,
    string? Membership);

public record ClubMemberResponse(Guid UserId, string FullName, string Role, DateTimeOffset JoinedAt);

public record ClubDetailResponse(
    Guid Id,
    string Name,
    string Description,
    string? LogoUrl,
    Guid CreatedBy,
    DateTimeOffset CreatedAt,
    string? Membership,
    IReadOnlyList<ClubMemberResponse> Members);

public record CreateClubRequest(string Name, string? Description);

public record InviteMemberRequest(Guid UserId);

public record SetClubRoleRequest(string Role);

public record AnnouncementResponse(
    Guid Id,
    string Title,
    string Content,
    string ScopeType,
    Guid? ScopeId,
    Guid AuthorId,
    string AuthorName,
    DateTimeOffset CreatedAt);

public record CreateAnnouncementRequest(string Title, string Content, string ScopeType, Guid? ScopeId);

public class CreateAssignmentRequest
{
    public Guid ClassId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DueDate { get; set; } = string.Empty;
    public IFormFile? File { get; set; }
}

public record AssignmentResponse(
    Guid Id,
    Guid ClassId,
    string Title,
    string Description,
    string? FileUrl,
    DateTimeOffset DueDate,
    Guid CreatedBy,
    DateTimeOffset CreatedAt);

public record MessageResponse(
    Guid Id,
    string ChannelType,
    Guid? ChannelId,
    Guid SenderId,
    string SenderName,
    string Content,
    DateTimeOffset CreatedAt);

public record CreateMessageRequest(string ChannelType, Guid? ChannelId, string Content);

using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IAnnouncementService
{
    Task<IReadOnlyList<AnnouncementResponse>> ListAsync(string scopeType, Guid? scopeId, CancellationToken cancellationToken);
    Task<AnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public class AnnouncementService : IAnnouncementService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;

    public AnnouncementService(AppDbContext db, AccessGuard access)
    {
        _db = db;
        _access = access;
    }

    public async Task<IReadOnlyList<AnnouncementResponse>> ListAsync(
        string scopeType,
        Guid? scopeId,
        CancellationToken cancellationToken)
    {
        await EnsureCanReadAsync(scopeType, scopeId, cancellationToken);
        return await _db.Announcements
            .Where(item => item.ScopeType == scopeType && item.ScopeId == scopeId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new AnnouncementResponse(
                item.Id,
                item.Title,
                item.Content,
                item.ScopeType,
                item.ScopeId,
                item.AuthorId,
                item.Author.FullName,
                item.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<AnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var scopeType = NormalizeScope(request.ScopeType, request.ScopeId);
        await EnsureCanWriteAsync(me.Id, me.SystemRole, scopeType, request.ScopeId, cancellationToken);
        var title = (request.Title ?? string.Empty).Trim();
        var content = (request.Content ?? string.Empty).Trim();
        if (title.Length is < 1 or > 160 || content.Length is < 1 or > 4000)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Başlık ve metin gerekli.");
        }

        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            Title = title,
            Content = content,
            ScopeType = scopeType,
            ScopeId = scopeType == "school" ? null : request.ScopeId,
            AuthorId = me.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(cancellationToken);
        return new AnnouncementResponse(
            announcement.Id,
            announcement.Title,
            announcement.Content,
            announcement.ScopeType,
            announcement.ScopeId,
            me.Id,
            me.FullName,
            announcement.CreatedAt);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var announcement = await _db.Announcements.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Duyuru bulunamadı.");
        var canDelete = announcement.AuthorId == me.Id;
        if (!canDelete && announcement.ScopeType == "school")
        {
            canDelete = me.SystemRole == "admin";
        }

        if (!canDelete && announcement.ScopeType == "class" && announcement.ScopeId is Guid classId)
        {
            var classroom = await _db.Classes.FirstOrDefaultAsync(item => item.Id == classId, cancellationToken);
            canDelete = classroom?.TeacherId == me.Id;
        }

        if (!canDelete && announcement.ScopeType == "club" && announcement.ScopeId is Guid clubId)
        {
            canDelete = await _db.ClubMembers.AnyAsync(
                member => member.ClubId == clubId && member.UserId == me.Id && member.Role == "admin",
                cancellationToken);
        }

        if (!canDelete)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Bu işlem için yetkin yok.");
        }

        _db.Announcements.Remove(announcement);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureCanReadAsync(string scopeType, Guid? scopeId, CancellationToken cancellationToken)
    {
        var normalized = NormalizeScope(scopeType, scopeId);
        await _access.RequireUserAsync(cancellationToken);
        if (normalized == "school")
        {
            return;
        }

        if (normalized == "class")
        {
            await _access.RequireClassParticipantAsync(scopeId!.Value, cancellationToken);
            return;
        }

        await _access.RequireClubMemberAsync(scopeId!.Value, cancellationToken);
    }

    private async Task EnsureCanWriteAsync(
        Guid userId,
        string systemRole,
        string scopeType,
        Guid? scopeId,
        CancellationToken cancellationToken)
    {
        if (scopeType == "school")
        {
            if (systemRole != "admin")
            {
                throw new AppException(StatusCodes.Status403Forbidden, "Okul duyurusunu yalnızca yönetici ekler.");
            }

            return;
        }

        if (scopeType == "class")
        {
            await _access.RequireClassTeacherAsync(scopeId!.Value, cancellationToken);
            return;
        }

        await _access.RequireClubAdminAsync(scopeId!.Value, cancellationToken);
        _ = userId;
    }

    private static string NormalizeScope(string? scopeType, Guid? scopeId)
    {
        var normalized = (scopeType ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized == "school")
        {
            if (scopeId is not null)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Okul duyurusunun kapsam kimliği olmaz.");
            }

            return normalized;
        }

        if (normalized is "class" or "club")
        {
            if (scopeId is null)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Kapsam kimliği gerekli.");
            }

            return normalized;
        }

        throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz duyuru kapsamı.");
    }
}

using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IClubService
{
    Task<IReadOnlyList<ClubResponse>> ListAsync(CancellationToken cancellationToken);
    Task<ClubDetailResponse> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<ClubDetailResponse> CreateAsync(CreateClubRequest request, CancellationToken cancellationToken);
    Task JoinAsync(Guid id, CancellationToken cancellationToken);
    Task LeaveAsync(Guid id, CancellationToken cancellationToken);
    Task InviteAsync(Guid id, Guid userId, CancellationToken cancellationToken);
    Task SetRoleAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken);
}

public class ClubService : IClubService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;

    public ClubService(AppDbContext db, AccessGuard access)
    {
        _db = db;
        _access = access;
    }

    public async Task<IReadOnlyList<ClubResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        return await _db.Clubs
            .OrderBy(club => club.Name)
            .Select(club => new ClubResponse(
                club.Id,
                club.Name,
                club.Description,
                club.LogoUrl,
                club.CreatedBy,
                club.CreatedAt,
                club.Members.Where(member => member.UserId == me.Id).Select(member => member.Role).FirstOrDefault()))
            .ToListAsync(cancellationToken);
    }

    public async Task<ClubDetailResponse> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        return await Project(id, me.Id, cancellationToken);
    }

    public async Task<ClubDetailResponse> CreateAsync(CreateClubRequest request, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var name = (request.Name ?? string.Empty).Trim();
        var description = (request.Description ?? string.Empty).Trim();
        if (name.Length < 2 || name.Length > 80)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Kulüp adı en az 2 karakter olmalı.");
        }

        if (description.Length > 500)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Açıklama en fazla 500 karakter olabilir.");
        }

        var club = new Club
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            CreatedBy = me.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Clubs.Add(club);
        _db.ClubMembers.Add(new ClubMember
        {
            ClubId = club.Id,
            UserId = me.Id,
            Role = "admin",
            JoinedAt = club.CreatedAt
        });
        await _db.SaveChangesAsync(cancellationToken);
        return await Project(club.Id, me.Id, cancellationToken);
    }

    public async Task JoinAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var exists = await _db.Clubs.AnyAsync(club => club.Id == id, cancellationToken);
        if (!exists)
        {
            throw new AppException(StatusCodes.Status404NotFound, "Kulüp bulunamadı.");
        }

        var already = await _db.ClubMembers.AnyAsync(
            member => member.ClubId == id && member.UserId == me.Id,
            cancellationToken);
        if (already)
        {
            throw new AppException(StatusCodes.Status409Conflict, "Bu kayıt zaten var.");
        }

        _db.ClubMembers.Add(new ClubMember
        {
            ClubId = id,
            UserId = me.Id,
            Role = "member",
            JoinedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task LeaveAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var membership = await _db.ClubMembers.FirstOrDefaultAsync(
            member => member.ClubId == id && member.UserId == me.Id,
            cancellationToken) ?? throw new AppException(StatusCodes.Status404NotFound, "Bu kulüpte üyeliğin yok.");
        if (membership.Role == "admin")
        {
            var adminCount = await _db.ClubMembers.CountAsync(
                member => member.ClubId == id && member.Role == "admin",
                cancellationToken);
            if (adminCount < 2)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Kulüpte başka bir yönetici kalsın. Üyelerden birini yönetici yap.");
            }
        }

        _db.ClubMembers.Remove(membership);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task InviteAsync(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        await _access.RequireClubAdminAsync(id, cancellationToken);
        var person = await _db.Users.AnyAsync(user => user.Id == userId, cancellationToken);
        if (!person)
        {
            throw new AppException(StatusCodes.Status404NotFound, "Kullanıcı bulunamadı.");
        }

        var already = await _db.ClubMembers.AnyAsync(
            member => member.ClubId == id && member.UserId == userId,
            cancellationToken);
        if (already)
        {
            throw new AppException(StatusCodes.Status409Conflict, "Bu kayıt zaten var.");
        }

        _db.ClubMembers.Add(new ClubMember
        {
            ClubId = id,
            UserId = userId,
            Role = "member",
            JoinedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetRoleAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        await _access.RequireClubAdminAsync(id, cancellationToken);
        if (me.Id == userId)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Kendi kulüp rolünü buradan değiştiremezsin.");
        }

        if (role is not ("member" or "admin"))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz rol.");
        }

        var membership = await _db.ClubMembers.FirstOrDefaultAsync(
            member => member.ClubId == id && member.UserId == userId,
            cancellationToken) ?? throw new AppException(StatusCodes.Status404NotFound, "Üye bulunamadı.");
        if (membership.Role == "admin" && role == "member")
        {
            var adminCount = await _db.ClubMembers.CountAsync(
                member => member.ClubId == id && member.Role == "admin",
                cancellationToken);
            if (adminCount < 2)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Kulüpte başka bir yönetici kalsın.");
            }
        }

        membership.Role = role;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<ClubDetailResponse> Project(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        var club = await _db.Clubs.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Kulüp bulunamadı.");
        var membership = await _db.ClubMembers
            .Where(member => member.ClubId == id && member.UserId == userId)
            .Select(member => member.Role)
            .FirstOrDefaultAsync(cancellationToken);
        var members = membership is null
            ? new List<ClubMemberResponse>()
            : await _db.ClubMembers
                .Where(member => member.ClubId == id)
                .OrderBy(member => member.User.FullName)
                .Select(member => new ClubMemberResponse(member.UserId, member.User.FullName, member.Role, member.JoinedAt))
                .ToListAsync(cancellationToken);
        return new ClubDetailResponse(
            club.Id,
            club.Name,
            club.Description,
            club.LogoUrl,
            club.CreatedBy,
            club.CreatedAt,
            membership,
            members);
    }
}

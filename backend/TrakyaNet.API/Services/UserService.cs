using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;

namespace TrakyaNet.API.Services;

public interface IUserService
{
    Task<IReadOnlyList<UserSearchResponse>> SearchAsync(string? query, CancellationToken cancellationToken);
    Task SetRoleAsync(Guid userId, string role, CancellationToken cancellationToken);
}

public class UserService : IUserService
{
    private static readonly HashSet<string> Roles = new(StringComparer.Ordinal) { "student", "teacher", "admin" };

    private readonly AppDbContext _db;
    private readonly AccessGuard _access;

    public UserService(AppDbContext db, AccessGuard access)
    {
        _db = db;
        _access = access;
    }

    public async Task<IReadOnlyList<UserSearchResponse>> SearchAsync(string? query, CancellationToken cancellationToken)
    {
        await _access.RequireUserAsync(cancellationToken);
        var term = (query ?? string.Empty).Trim();
        if (term.Length < 2)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Aramak için en az 2 karakter yaz.");
        }

        var pattern = $"%{term.Replace("%", "").Replace("_", "")}%";
        return await _db.Users
            .Where(user => EF.Functions.ILike(user.FullName, pattern))
            .OrderBy(user => user.FullName)
            .Take(8)
            .Select(user => new UserSearchResponse(user.Id, user.FullName, user.AvatarUrl, user.SystemRole, user.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task SetRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        if (me.SystemRole != "admin")
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Yalnızca yönetici rol değiştirebilir.");
        }

        if (me.Id == userId)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Kendi rolünü buradan değiştiremezsin.");
        }

        if (!Roles.Contains(role))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz rol.");
        }

        var target = await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Kullanıcı bulunamadı.");
        target.SystemRole = role;
        await _db.SaveChangesAsync(cancellationToken);
    }
}

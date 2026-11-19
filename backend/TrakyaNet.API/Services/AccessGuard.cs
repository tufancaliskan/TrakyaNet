using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    Guid Id { get; }
}

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated == true;

    public Guid Id
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(value, out var id))
            {
                throw new AppException(StatusCodes.Status401Unauthorized, "Oturum gerekli.");
            }

            return id;
        }
    }
}

public class AccessGuard
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _current;
    private User? _user;

    public AccessGuard(AppDbContext db, ICurrentUser current)
    {
        _db = db;
        _current = current;
    }

    public async Task<User> RequireUserAsync(CancellationToken cancellationToken)
    {
        if (_user is not null)
        {
            return _user;
        }

        if (!_current.IsAuthenticated)
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "Oturum gerekli.");
        }

        _user = await _db.Users.FirstOrDefaultAsync(user => user.Id == _current.Id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status401Unauthorized, "Oturum gerekli.");
        return _user;
    }

    public async Task<ClassRoom> RequireClassParticipantAsync(Guid classId, CancellationToken cancellationToken)
    {
        var me = await RequireUserAsync(cancellationToken);
        var classroom = await _db.Classes.FirstOrDefaultAsync(item => item.Id == classId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Sınıf bulunamadı.");
        if (classroom.TeacherId == me.Id)
        {
            return classroom;
        }

        var member = await _db.ClassMembers.AnyAsync(
            item => item.ClassId == classId && item.UserId == me.Id,
            cancellationToken);
        if (!member)
        {
            throw new AppException(StatusCodes.Status404NotFound, "Sınıf bulunamadı.");
        }

        return classroom;
    }

    public async Task<ClassRoom> RequireClassTeacherAsync(Guid classId, CancellationToken cancellationToken)
    {
        var me = await RequireUserAsync(cancellationToken);
        var classroom = await _db.Classes.FirstOrDefaultAsync(item => item.Id == classId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Sınıf bulunamadı.");
        if (classroom.TeacherId != me.Id)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Bu işlem yalnızca sınıfın öğretmenine açık.");
        }

        return classroom;
    }

    public async Task RequireClubMemberAsync(Guid clubId, CancellationToken cancellationToken)
    {
        var me = await RequireUserAsync(cancellationToken);
        var exists = await _db.Clubs.AnyAsync(club => club.Id == clubId, cancellationToken);
        if (!exists)
        {
            throw new AppException(StatusCodes.Status404NotFound, "Kulüp bulunamadı.");
        }

        var member = await _db.ClubMembers.AnyAsync(
            item => item.ClubId == clubId && item.UserId == me.Id,
            cancellationToken);
        if (!member)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Bu işlem yalnızca kulüp üyelerine açık.");
        }
    }

    public async Task RequireClubAdminAsync(Guid clubId, CancellationToken cancellationToken)
    {
        var me = await RequireUserAsync(cancellationToken);
        var role = await _db.ClubMembers
            .Where(item => item.ClubId == clubId && item.UserId == me.Id)
            .Select(item => item.Role)
            .FirstOrDefaultAsync(cancellationToken);
        if (role is null)
        {
            var exists = await _db.Clubs.AnyAsync(club => club.Id == clubId, cancellationToken);
            throw new AppException(
                exists ? StatusCodes.Status403Forbidden : StatusCodes.Status404NotFound,
                exists ? "Bu işlem yalnızca kulüp yöneticisine açık." : "Kulüp bulunamadı.");
        }

        if (role != "admin")
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Bu işlem yalnızca kulüp yöneticisine açık.");
        }
    }
}

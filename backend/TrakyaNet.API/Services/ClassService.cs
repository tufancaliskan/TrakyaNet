using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IClassService
{
    Task<IReadOnlyList<ClassResponse>> ListAsync(CancellationToken cancellationToken);
    Task<ClassResponse> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<ClassResponse> CreateAsync(CreateClassRequest request, CancellationToken cancellationToken);
    Task<Guid> JoinAsync(JoinClassRequest request, CancellationToken cancellationToken);
    Task LeaveAsync(Guid id, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public class ClassService : IClassService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;
    private readonly IFileService _files;

    public ClassService(AppDbContext db, AccessGuard access, IFileService files)
    {
        _db = db;
        _access = access;
        _files = files;
    }

    public async Task<IReadOnlyList<ClassResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        return await _db.Classes
            .Where(item => item.TeacherId == me.Id || item.Members.Any(member => member.UserId == me.Id))
            .OrderBy(item => item.Name)
            .Select(item => new ClassResponse(
                item.Id,
                item.Name,
                item.TeacherId == me.Id ? item.Code : null,
                item.TeacherId,
                item.Teacher.FullName,
                item.CreatedAt,
                item.Members.Count,
                item.Members.Any(member => member.UserId == me.Id)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ClassResponse> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        await _access.RequireClassParticipantAsync(id, cancellationToken);
        return await Project(id, me.Id, cancellationToken);
    }

    public async Task<ClassResponse> CreateAsync(CreateClassRequest request, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        if (me.SystemRole != "teacher")
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Sınıf açmak için öğretmen rolü gerekir.");
        }

        var name = (request.Name ?? string.Empty).Trim();
        if (name.Length < 2 || name.Length > 80)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Sınıf adı en az 2 karakter olmalı.");
        }

        var classroom = new ClassRoom
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = await NextCodeAsync(cancellationToken),
            TeacherId = me.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Classes.Add(classroom);
        await _db.SaveChangesAsync(cancellationToken);
        return await Project(classroom.Id, me.Id, cancellationToken);
    }

    public async Task<Guid> JoinAsync(JoinClassRequest request, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var code = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        if (!JoinCode.IsValid(code))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Sınıf kodu 6 karakter olmalı.");
        }

        var classroom = await _db.Classes.FirstOrDefaultAsync(item => item.Code == code, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Sınıf bulunamadı.");
        var already = await _db.ClassMembers.AnyAsync(
            member => member.ClassId == classroom.Id && member.UserId == me.Id,
            cancellationToken);
        if (!already && classroom.TeacherId != me.Id)
        {
            _db.ClassMembers.Add(new ClassMember
            {
                ClassId = classroom.Id,
                UserId = me.Id,
                JoinedAt = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync(cancellationToken);
        }

        return classroom.Id;
    }

    public async Task LeaveAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var membership = await _db.ClassMembers.FirstOrDefaultAsync(
            member => member.ClassId == id && member.UserId == me.Id,
            cancellationToken) ?? throw new AppException(StatusCodes.Status404NotFound, "Bu sınıfta üyeliğin yok.");
        _db.ClassMembers.Remove(membership);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var classroom = await _access.RequireClassTeacherAsync(id, cancellationToken);
        var files = await _db.Assignments
            .Where(item => item.ClassId == id && item.FileUrl != null)
            .Select(item => item.FileUrl!)
            .ToListAsync(cancellationToken);
        var announcements = await _db.Announcements
            .Where(item => item.ScopeType == "class" && item.ScopeId == id)
            .ToListAsync(cancellationToken);
        var messages = await _db.Messages
            .Where(item => item.ChannelType == "class" && item.ChannelId == id)
            .ToListAsync(cancellationToken);
        _db.Announcements.RemoveRange(announcements);
        _db.Messages.RemoveRange(messages);
        _db.Classes.Remove(classroom);
        await _db.SaveChangesAsync(cancellationToken);
        foreach (var file in files)
        {
            _files.Delete(file);
        }
    }

    private async Task<ClassResponse> Project(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        return await _db.Classes
            .Where(item => item.Id == id)
            .Select(item => new ClassResponse(
                item.Id,
                item.Name,
                item.TeacherId == userId ? item.Code : null,
                item.TeacherId,
                item.Teacher.FullName,
                item.CreatedAt,
                item.Members.Count,
                item.Members.Any(member => member.UserId == userId)))
            .FirstAsync(cancellationToken);
    }

    private async Task<string> NextCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var code = JoinCode.Create();
            if (!await _db.Classes.AnyAsync(item => item.Code == code, cancellationToken))
            {
                return code;
            }
        }

        throw new AppException(StatusCodes.Status500InternalServerError, "Sınıf kodu üretilemedi.");
    }
}

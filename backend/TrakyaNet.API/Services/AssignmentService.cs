using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IAssignmentService
{
    Task<IReadOnlyList<AssignmentResponse>> ListAsync(Guid classId, CancellationToken cancellationToken);
    Task<AssignmentResponse> CreateAsync(CreateAssignmentRequest request, string? filePath, CancellationToken cancellationToken);
    Task<string?> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<string> RequireFilePathAsync(Guid id, CancellationToken cancellationToken);
}

public class AssignmentService : IAssignmentService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;

    public AssignmentService(AppDbContext db, AccessGuard access)
    {
        _db = db;
        _access = access;
    }

    public async Task<IReadOnlyList<AssignmentResponse>> ListAsync(Guid classId, CancellationToken cancellationToken)
    {
        await _access.RequireClassParticipantAsync(classId, cancellationToken);
        return await _db.Assignments
            .Where(item => item.ClassId == classId)
            .OrderBy(item => item.DueDate)
            .Select(item => new AssignmentResponse(
                item.Id,
                item.ClassId,
                item.Title,
                item.Description,
                item.FileUrl,
                item.DueDate,
                item.CreatedBy,
                item.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<AssignmentResponse> CreateAsync(
        CreateAssignmentRequest request,
        string? filePath,
        CancellationToken cancellationToken)
    {
        await _access.RequireClassTeacherAsync(request.ClassId, cancellationToken);
        var me = await _access.RequireUserAsync(cancellationToken);
        var title = (request.Title ?? string.Empty).Trim();
        var description = (request.Description ?? string.Empty).Trim();
        if (title.Length is < 1 or > 160)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Ödev başlığı gerekli.");
        }

        if (description.Length > 4000)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Açıklama en fazla 4000 karakter olabilir.");
        }

        if (!DateTimeOffset.TryParse(request.DueDate, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dueDate))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Son teslim tarihini YYYY-AA-GG biçiminde yaz.");
        }

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            ClassId = request.ClassId,
            Title = title,
            Description = description,
            FileUrl = filePath,
            DueDate = dueDate,
            CreatedBy = me.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Assignments.Add(assignment);
        await _db.SaveChangesAsync(cancellationToken);
        return new AssignmentResponse(
            assignment.Id,
            assignment.ClassId,
            assignment.Title,
            assignment.Description,
            assignment.FileUrl,
            assignment.DueDate,
            assignment.CreatedBy,
            assignment.CreatedAt);
    }

    public async Task<string?> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var assignment = await _db.Assignments.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Ödev bulunamadı.");
        await _access.RequireClassTeacherAsync(assignment.ClassId, cancellationToken);
        var file = assignment.FileUrl;
        _db.Assignments.Remove(assignment);
        await _db.SaveChangesAsync(cancellationToken);
        return file;
    }

    public async Task<string> RequireFilePathAsync(Guid id, CancellationToken cancellationToken)
    {
        var assignment = await _db.Assignments.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Ödev bulunamadı.");
        await _access.RequireClassParticipantAsync(assignment.ClassId, cancellationToken);
        if (string.IsNullOrWhiteSpace(assignment.FileUrl))
        {
            throw new AppException(StatusCodes.Status404NotFound, "Bu ödevin dosyası yok.");
        }

        return assignment.FileUrl;
    }
}

using Microsoft.EntityFrameworkCore;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IMessageService
{
    Task EnsureChannelAsync(string channelType, Guid? channelId, CancellationToken cancellationToken);
    Task<IReadOnlyList<MessageResponse>> ListAsync(string channelType, Guid? channelId, CancellationToken cancellationToken);
    Task<MessageResponse> CreateAsync(string channelType, Guid? channelId, string content, CancellationToken cancellationToken);
    Task<MessageResponse> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public class MessageService : IMessageService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;

    public MessageService(AppDbContext db, AccessGuard access)
    {
        _db = db;
        _access = access;
    }

    public async Task EnsureChannelAsync(string channelType, Guid? channelId, CancellationToken cancellationToken)
    {
        await EnsureAccessAsync(channelType, channelId, write: false, cancellationToken);
    }

    public async Task<IReadOnlyList<MessageResponse>> ListAsync(
        string channelType,
        Guid? channelId,
        CancellationToken cancellationToken)
    {
        var normalized = await EnsureAccessAsync(channelType, channelId, write: false, cancellationToken);
        var rows = await _db.Messages
            .Where(item => item.ChannelType == normalized && item.ChannelId == channelId)
            .OrderByDescending(item => item.CreatedAt)
            .Take(200)
            .Select(item => new MessageResponse(
                item.Id,
                item.ChannelType,
                item.ChannelId,
                item.SenderId,
                item.Sender.FullName,
                item.Content,
                item.CreatedAt))
            .ToListAsync(cancellationToken);
        rows.Reverse();
        return rows;
    }

    public async Task<MessageResponse> CreateAsync(
        string channelType,
        Guid? channelId,
        string content,
        CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var normalized = await EnsureAccessAsync(channelType, channelId, write: true, cancellationToken);
        var text = (content ?? string.Empty).Trim();
        if (text.Length is < 1 or > 2000)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Mesaj 1 ile 2000 karakter arasında olmalı.");
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelType = normalized,
            ChannelId = normalized == "school" ? null : channelId,
            SenderId = me.Id,
            Content = text,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Messages.Add(message);
        await _db.SaveChangesAsync(cancellationToken);
        return new MessageResponse(message.Id, message.ChannelType, message.ChannelId, me.Id, me.FullName, message.Content, message.CreatedAt);
    }

    public async Task<MessageResponse> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var me = await _access.RequireUserAsync(cancellationToken);
        var message = await _db.Messages.Include(item => item.Sender).FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Mesaj bulunamadı.");
        if (message.SenderId != me.Id)
        {
            throw new AppException(StatusCodes.Status403Forbidden, "Yalnızca kendi mesajını silebilirsin.");
        }

        var response = new MessageResponse(
            message.Id,
            message.ChannelType,
            message.ChannelId,
            message.SenderId,
            message.Sender.FullName,
            message.Content,
            message.CreatedAt);
        _db.Messages.Remove(message);
        await _db.SaveChangesAsync(cancellationToken);
        return response;
    }

    private async Task<string> EnsureAccessAsync(
        string? channelType,
        Guid? channelId,
        bool write,
        CancellationToken cancellationToken)
    {
        var normalized = (channelType ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized == "school")
        {
            if (channelId is not null)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Okul kanalının kimliği olmaz.");
            }

            await _access.RequireUserAsync(cancellationToken);
            return normalized;
        }

        if (channelId is null)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Kanal kimliği gerekli.");
        }

        if (normalized == "class")
        {
            await _access.RequireClassParticipantAsync(channelId.Value, cancellationToken);
            return normalized;
        }

        if (normalized == "club")
        {
            await _access.RequireClubMemberAsync(channelId.Value, cancellationToken);
            return normalized;
        }

        _ = write;
        throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz kanal.");
    }
}

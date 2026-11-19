using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TrakyaNet.API.Common;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMessageService _messages;

    public ChatHub(IMessageService messages)
    {
        _messages = messages;
    }

    public Task JoinChannel(string channelType, string? channelId)
    {
        return Guard(async () =>
        {
            var id = ParseChannelId(channelType, channelId);
            var normalized = Normalize(channelType);
            await _messages.EnsureChannelAsync(normalized, id, Context.ConnectionAborted);
            await Groups.AddToGroupAsync(Context.ConnectionId, ChannelNames.Group(normalized, id));
        });
    }

    public Task<MessageResponse> SendMessage(string channelType, string? channelId, string content)
    {
        return Guard(async () =>
        {
            var id = ParseChannelId(channelType, channelId);
            var normalized = Normalize(channelType);
            var message = await _messages.CreateAsync(normalized, id, content, Context.ConnectionAborted);
            await Clients.Group(ChannelNames.Group(normalized, id)).SendAsync("MessageReceived", message);
            return message;
        });
    }

    private static async Task Guard(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (AppException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    private static async Task<T> Guard<T>(Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (AppException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    private static string Normalize(string? channelType)
    {
        var normalized = (channelType ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized is not ("school" or "class" or "club"))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz kanal.");
        }

        return normalized;
    }

    private static Guid? ParseChannelId(string channelType, string? channelId)
    {
        var normalized = Normalize(channelType);
        if (normalized == "school")
        {
            return null;
        }

        if (!Guid.TryParse(channelId, out var id))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Kanal kimliği gerekli.");
        }

        return id;
    }
}

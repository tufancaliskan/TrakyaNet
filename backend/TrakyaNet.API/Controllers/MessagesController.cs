using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TrakyaNet.API.Common;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Hubs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/messages")]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messages;
    private readonly IHubContext<ChatHub> _hub;

    public MessagesController(IMessageService messages, IHubContext<ChatHub> hub)
    {
        _messages = messages;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MessageResponse>>> List(
        [FromQuery(Name = "channel_type")] string channelType,
        [FromQuery(Name = "channel_id")] Guid? channelId,
        CancellationToken cancellationToken)
    {
        return Ok(await _messages.ListAsync(channelType, channelId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<MessageResponse>> Create(CreateMessageRequest request, CancellationToken cancellationToken)
    {
        var message = await _messages.CreateAsync(request.ChannelType, request.ChannelId, request.Content, cancellationToken);
        await _hub.Clients.Group(ChannelNames.Group(message.ChannelType, message.ChannelId)).SendAsync("MessageReceived", message, cancellationToken);
        return Ok(message);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var message = await _messages.DeleteAsync(id, cancellationToken);
        await _hub.Clients.Group(ChannelNames.Group(message.ChannelType, message.ChannelId)).SendAsync("MessageDeleted", new { id = message.Id }, cancellationToken);
        return NoContent();
    }
}

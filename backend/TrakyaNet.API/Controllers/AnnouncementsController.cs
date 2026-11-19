using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/announcements")]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcements;

    public AnnouncementsController(IAnnouncementService announcements)
    {
        _announcements = announcements;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AnnouncementResponse>>> List(
        [FromQuery(Name = "scope_type")] string scopeType,
        [FromQuery(Name = "scope_id")] Guid? scopeId,
        CancellationToken cancellationToken)
    {
        return Ok(await _announcements.ListAsync(scopeType, scopeId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<AnnouncementResponse>> Create(CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _announcements.CreateAsync(request, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _announcements.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/clubs")]
public class ClubsController : ControllerBase
{
    private readonly IClubService _clubs;

    public ClubsController(IClubService clubs)
    {
        _clubs = clubs;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClubResponse>>> List(CancellationToken cancellationToken)
    {
        return Ok(await _clubs.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClubDetailResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _clubs.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<ClubDetailResponse>> Create(CreateClubRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _clubs.CreateAsync(request, cancellationToken));
    }

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id, CancellationToken cancellationToken)
    {
        await _clubs.JoinAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}/members/me")]
    public async Task<IActionResult> Leave(Guid id, CancellationToken cancellationToken)
    {
        await _clubs.LeaveAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> Invite(Guid id, InviteMemberRequest request, CancellationToken cancellationToken)
    {
        await _clubs.InviteAsync(id, request.UserId, cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/members/{userId:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, Guid userId, SetClubRoleRequest request, CancellationToken cancellationToken)
    {
        await _clubs.SetRoleAsync(id, userId, request.Role, cancellationToken);
        return NoContent();
    }
}

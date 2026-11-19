using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users)
    {
        _users = users;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserSearchResponse>>> Search(
        [FromQuery(Name = "query")] string? query,
        CancellationToken cancellationToken)
    {
        return Ok(await _users.SearchAsync(query, cancellationToken));
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, SetRoleRequest request, CancellationToken cancellationToken)
    {
        await _users.SetRoleAsync(id, request.Role, cancellationToken);
        return NoContent();
    }
}

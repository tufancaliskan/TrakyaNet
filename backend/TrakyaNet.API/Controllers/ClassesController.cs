using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/classes")]
public class ClassesController : ControllerBase
{
    private readonly IClassService _classes;

    public ClassesController(IClassService classes)
    {
        _classes = classes;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClassResponse>>> List(CancellationToken cancellationToken)
    {
        return Ok(await _classes.ListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClassResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _classes.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<ClassResponse>> Create(CreateClassRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _classes.CreateAsync(request, cancellationToken));
    }

    [HttpPost("join")]
    public async Task<ActionResult<IdResponse>> Join(JoinClassRequest request, CancellationToken cancellationToken)
    {
        var id = await _classes.JoinAsync(request, cancellationToken);
        return Ok(new IdResponse(id));
    }

    [HttpDelete("{id:guid}/members/me")]
    public async Task<IActionResult> Leave(Guid id, CancellationToken cancellationToken)
    {
        await _classes.LeaveAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _classes.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignments;
    private readonly IFileService _files;

    public AssignmentsController(IAssignmentService assignments, IFileService files)
    {
        _assignments = assignments;
        _files = files;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AssignmentResponse>>> List(
        [FromQuery(Name = "class_id")] Guid classId,
        CancellationToken cancellationToken)
    {
        return Ok(await _assignments.ListAsync(classId, cancellationToken));
    }

    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    public async Task<ActionResult<AssignmentResponse>> Create([FromForm] CreateAssignmentRequest request, CancellationToken cancellationToken)
    {
        string? path = null;
        try
        {
            if (request.File is not null)
            {
                path = await _files.SaveAssignmentPdfAsync(request.ClassId, request.File, cancellationToken);
            }

            return Ok(await _assignments.CreateAsync(request, path, cancellationToken));
        }
        catch
        {
            _files.Delete(path);
            throw;
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var path = await _assignments.DeleteAsync(id, cancellationToken);
        _files.Delete(path);
        return NoContent();
    }

    [HttpGet("{id:guid}/file")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var path = await _assignments.RequireFilePathAsync(id, cancellationToken);
        var stream = _files.OpenRead(path);
        return File(stream, "application/pdf");
    }
}

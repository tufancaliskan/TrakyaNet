using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Services;

namespace TrakyaNet.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IFileService _files;

    public AuthController(IAuthService auth, IFileService files)
    {
        _auth = auth;
        _files = files;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _auth.RegisterAsync(request, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _auth.LoginAsync(request, cancellationToken));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        return Ok(await _auth.MeAsync(cancellationToken));
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateMe(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _auth.UpdateNameAsync(request, cancellationToken));
    }

    [Authorize]
    [HttpPost("me/avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 5 * 1024 * 1024)]
    public async Task<ActionResult<UserResponse>> UploadAvatar(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null)
        {
            return BadRequest(new { message = "Fotoğraf seç." });
        }

        return Ok(await _auth.UpdateAvatarAsync(file, cancellationToken));
    }

    [Authorize]
    [HttpDelete("me/avatar")]
    public async Task<ActionResult<UserResponse>> RemoveAvatar(CancellationToken cancellationToken)
    {
        return Ok(await _auth.RemoveAvatarAsync(cancellationToken));
    }

    [Authorize]
    [HttpGet("me/avatar")]
    public async Task<IActionResult> Avatar(CancellationToken cancellationToken)
    {
        var path = await _auth.GetAvatarPathAsync(cancellationToken);
        var stream = _files.OpenRead(path);
        var extension = Path.GetExtension(path).ToLowerInvariant();
        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".heic" => "image/heic",
            _ => "image/jpeg"
        };
        return File(stream, contentType);
    }
}

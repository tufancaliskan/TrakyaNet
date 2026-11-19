using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TrakyaNet.API.Common;
using TrakyaNet.API.Data;
using TrakyaNet.API.DTOs;
using TrakyaNet.API.Entities;

namespace TrakyaNet.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<UserResponse> MeAsync(CancellationToken cancellationToken);
    Task<UserResponse> UpdateNameAsync(UpdateProfileRequest request, CancellationToken cancellationToken);
    Task<UserResponse> UpdateAvatarAsync(IFormFile file, CancellationToken cancellationToken);
    Task<UserResponse> RemoveAvatarAsync(CancellationToken cancellationToken);
    Task<string> GetAvatarPathAsync(CancellationToken cancellationToken);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly AccessGuard _access;
    private readonly IFileService _files;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext db, AccessGuard access, IFileService files, IConfiguration configuration)
    {
        _db = db;
        _access = access;
        _files = files;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var fullName = RequireName(request.FullName);
        var email = RequireEmail(request.Email);
        RequirePassword(request.Password);

        if (await _db.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            throw new AppException(StatusCodes.Status409Conflict, "Bu e-posta zaten kayıtlı.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            SystemRole = "student",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(CreateToken(user), ToResponse(user));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = RequireEmail(request.Email);
        var user = await _db.Users.FirstOrDefaultAsync(item => item.Email == email, cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "E-posta veya şifre hatalı.");
        }

        return new AuthResponse(CreateToken(user), ToResponse(user));
    }

    public async Task<UserResponse> MeAsync(CancellationToken cancellationToken)
    {
        return ToResponse(await _access.RequireUserAsync(cancellationToken));
    }

    public async Task<UserResponse> UpdateNameAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await _access.RequireUserAsync(cancellationToken);
        user.FullName = RequireName(request.FullName);
        await _db.SaveChangesAsync(cancellationToken);
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateAvatarAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var user = await _access.RequireUserAsync(cancellationToken);
        var previous = user.AvatarUrl;
        var path = await _files.SaveAvatarAsync(user.Id, file, cancellationToken);
        user.AvatarUrl = path;
        await _db.SaveChangesAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(previous) && previous != path)
        {
            _files.Delete(previous);
        }

        return ToResponse(user);
    }

    public async Task<UserResponse> RemoveAvatarAsync(CancellationToken cancellationToken)
    {
        var user = await _access.RequireUserAsync(cancellationToken);
        var previous = user.AvatarUrl;
        user.AvatarUrl = null;
        await _db.SaveChangesAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(previous))
        {
            _files.Delete(previous);
        }

        return ToResponse(user);
    }

    public async Task<string> GetAvatarPathAsync(CancellationToken cancellationToken)
    {
        var user = await _access.RequireUserAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(user.AvatarUrl))
        {
            throw new AppException(StatusCodes.Status404NotFound, "Profil fotoğrafı yok.");
        }

        return user.AvatarUrl;
    }

    public static UserResponse ToResponse(User user)
    {
        return new UserResponse(user.Id, user.FullName, user.Email, user.AvatarUrl, user.SystemRole, user.CreatedAt);
    }

    private string CreateToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key eksik.");
        var expiresDays = int.TryParse(_configuration["Jwt:ExpiresDays"], out var days) ? days : 7;
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.SystemRole)
            },
            expires: DateTime.UtcNow.AddDays(expiresDays),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string RequireName(string? value)
    {
        var name = (value ?? string.Empty).Trim();
        if (name.Length < 2 || name.Length > 80)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Ad soyad 2 ile 80 karakter arasında olmalı.");
        }

        return name;
    }

    private static string RequireEmail(string? value)
    {
        var email = (value ?? string.Empty).Trim().ToLowerInvariant();
        if (email.Length < 5 || email.Length > 160 || !email.Contains('@') || email.Contains(' '))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Geçerli bir e-posta yaz.");
        }

        return email;
    }

    private static void RequirePassword(string? value)
    {
        if (string.IsNullOrEmpty(value) || value.Length < 6)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Şifre en az 6 karakter olmalı.");
        }
    }
}

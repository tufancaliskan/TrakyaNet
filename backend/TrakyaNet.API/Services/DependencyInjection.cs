using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace TrakyaNet.API.Services;

public static class DependencyInjection
{
    public static IServiceCollection AddTrakyaNet(this IServiceCollection services, IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key en az 32 karakter olmalı. appsettings.Development.json dosyasına yaz.");
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = configuration["Jwt:Audience"],
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role,
                    NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) &&
                            (path.StartsWithSegments("/hubs/chat")
                             || path.Value?.EndsWith("/file", StringComparison.OrdinalIgnoreCase) == true
                             || path.Value?.EndsWith("/avatar", StringComparison.OrdinalIgnoreCase) == true))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });
        services.AddAuthorization();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<AccessGuard>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IClassService, ClassService>();
        services.AddScoped<IClubService, ClubService>();
        services.AddScoped<IAnnouncementService, AnnouncementService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IMessageService, MessageService>();
        return services;
    }
}

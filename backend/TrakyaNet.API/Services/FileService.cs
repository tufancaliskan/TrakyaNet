using TrakyaNet.API.Common;

namespace TrakyaNet.API.Services;

public interface IFileService
{
    Task<string> SaveAssignmentPdfAsync(Guid classId, IFormFile file, CancellationToken cancellationToken);
    Task<string> SaveAvatarAsync(Guid userId, IFormFile file, CancellationToken cancellationToken);
    void Delete(string? relativePath);
    FileStream OpenRead(string relativePath);
}

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _environment;

    public FileService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveAssignmentPdfAsync(Guid classId, IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "PDF dosyası boş.");
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "PDF en fazla 10 MB olabilir.");
        }

        var extension = Path.GetExtension(file.FileName);
        if (!extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Yalnızca PDF yüklenebilir.");
        }

        await using (var probe = file.OpenReadStream())
        {
            var header = new byte[5];
            var read = await probe.ReadAsync(header, cancellationToken);
            var isPdf = read >= 4 && header[0] == (byte)'%' && header[1] == (byte)'P' && header[2] == (byte)'D' && header[3] == (byte)'F';
            if (!isPdf)
            {
                throw new AppException(StatusCodes.Status400BadRequest, "Yalnızca PDF yüklenebilir.");
            }
        }

        var original = Path.GetFileName(file.FileName);
        var cleaned = new string(original.Select(character => char.IsLetterOrDigit(character) || character is '.' or '_' or '-' ? character : '_').ToArray());
        if (cleaned.Length > 80)
        {
            cleaned = cleaned[^80..];
        }

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            cleaned = "odev.pdf";
        }

        var relative = Path.Combine("uploads", "assignments", classId.ToString(), $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{cleaned}");
        var fullPath = Resolve(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var output = File.Create(fullPath);
        await file.CopyToAsync(output, cancellationToken);
        return relative.Replace('\\', '/');
    }

    public async Task<string> SaveAvatarAsync(Guid userId, IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Fotoğraf boş.");
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Fotoğraf en fazla 5 MB olabilir.");
        }

        await using var probe = file.OpenReadStream();
        var header = new byte[12];
        var read = await probe.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        var extension = DetectImageExtension(header, read);
        var relative = Path.Combine("uploads", "avatars", userId.ToString(), $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.{extension}");
        var fullPath = Resolve(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var output = File.Create(fullPath);
        await file.CopyToAsync(output, cancellationToken);
        return relative.Replace('\\', '/');
    }

    public void Delete(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        var fullPath = Resolve(relativePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }

    public FileStream OpenRead(string relativePath)
    {
        var fullPath = Resolve(relativePath);
        if (!File.Exists(fullPath))
        {
            throw new AppException(StatusCodes.Status404NotFound, "Dosya bulunamadı.");
        }

        return File.OpenRead(fullPath);
    }

    private static string DetectImageExtension(byte[] header, int read)
    {
        var jpeg = read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
        var png = read >= 4 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;
        var webp = read >= 12
            && header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F'
            && header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P';
        var heic = read >= 12
            && header[4] == (byte)'f' && header[5] == (byte)'t' && header[6] == (byte)'y' && header[7] == (byte)'p';
        if (jpeg) return "jpg";
        if (png) return "png";
        if (webp) return "webp";
        if (heic) return "heic";
        throw new AppException(StatusCodes.Status400BadRequest, "Yalnızca JPG, PNG veya WEBP seçebilirsin.");
    }

    private string Resolve(string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        if (normalized.Contains("..", StringComparison.Ordinal))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Dosya yolu geçersiz.");
        }

        var root = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var fullRoot = Path.GetFullPath(root);
        var fullPath = Path.GetFullPath(Path.Combine(fullRoot, normalized));
        if (!fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Dosya yolu geçersiz.");
        }

        return fullPath;
    }
}

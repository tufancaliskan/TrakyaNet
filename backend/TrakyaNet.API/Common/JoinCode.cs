using System.Security.Cryptography;

namespace TrakyaNet.API.Common;

public static class JoinCode
{
    public const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static string Create()
    {
        Span<char> buffer = stackalloc char[6];
        for (var index = 0; index < buffer.Length; index++)
        {
            buffer[index] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return new string(buffer);
    }

    public static bool IsValid(string code)
    {
        return code.Length == 6 && code.All(character => Alphabet.Contains(character));
    }
}

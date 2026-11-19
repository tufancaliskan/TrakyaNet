namespace TrakyaNet.API.Common;

public static class ChannelNames
{
    public static string Group(string channelType, Guid? channelId)
    {
        return channelType switch
        {
            "school" => "school",
            "class" => $"class_{channelId}",
            "club" => $"club_{channelId}",
            _ => throw new AppException(StatusCodes.Status400BadRequest, "Geçersiz kanal.")
        };
    }
}

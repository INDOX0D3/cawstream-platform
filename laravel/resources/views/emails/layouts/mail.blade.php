@props([
    'title' => '',
    'siteName' => null,
    'supportEmail' => null,
])

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>{{ $title ?: $siteName }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    <tr>
                        <td align="center" style="padding-bottom:24px;">
                            <span style="font-size:18px;font-weight:800;color:#18181b;letter-spacing:-0.02em;">{{ $siteName }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#ffffff;border-radius:16px;padding:36px 32px;border:1px solid #e4e4e7;">
                            {{ $slot }}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-top:24px;font-size:12px;line-height:1.6;color:#a1a1aa;">
                            &copy; {{ date('Y') }} {{ $siteName }}
                            @if ($supportEmail)
                                <br><a href="mailto:{{ $supportEmail }}" style="color:#71717a;text-decoration:none;">{{ $supportEmail }}</a>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

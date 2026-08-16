@props([
    'siteName' => null,
    'user' => null,
    'url' => '',
])

<x-emails.layouts.mail
    :title="'['.$siteName.'] '.t('auth.resetPassword')"
    :site-name="$siteName"
    :support-email="config('cawstream.site.support_email') ?: null"
>
    <h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#18181b;">{{ t('auth.resetPassword') }}</h1>
    <p style="margin:0 0 26px;font-size:14px;line-height:1.65;color:#52525b;">{{ t('auth.resetMailIntro', ['name' => $user->name, 'site' => $siteName]) }}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
        <tr>
            <td align="center">
                <a href="{{ $url }}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 30px;border-radius:9999px;">{{ t('auth.resetButton') }}</a>
            </td>
        </tr>
    </table>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">{{ t('auth.resetExpires') }}</p>

    <p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #f0f0f1;font-size:12px;line-height:1.5;color:#a1a1aa;word-break:break-all;">{{ $url }}</p>
</x-emails.layouts.mail>

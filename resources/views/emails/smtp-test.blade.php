<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>SMTP test</title>
</head>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 24px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e4e4e7;">
        <h1 style="margin: 0 0 8px; font-size: 18px; color: #18181b;">SMTP test mail</h1>
        <p style="margin: 0 0 16px; font-size: 14px; color: #52525b;">This email confirms that the SMTP configuration for {{ site_name() }} is working correctly.</p>
        <p style="margin: 0; font-size: 14px; color: #52525b;">Sent at {{ now()->format('d M Y H:i:s') }} ({{ config('app.timezone') }}).</p>
    </div>
</body>
</html>

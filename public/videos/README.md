# Video files

Drop your video files here on the server:

```
/var/www/vidood/videos/<your-video>.mp4
```

They are served statically at `/videos/<your-video>.mp4` — no backend involved.

Then add an entry to `public/data/videos.json` (or use the admin panel at
`/admin` and export the JSON):

```json
{
  "id": "my-clip",
  "title": "My Clip",
  "description": "Something about the clip.",
  "category": "Action",
  "poster": "/videos/my-clip-poster.jpg",
  "src": "/videos/my-clip.mp4",
  "duration": "4:12",
  "views": 0,
  "featured": false,
  "uploadedAt": "2026-08-01"
}
```

The app reads `/data/videos.json` at runtime, so **no rebuild is needed** after
editing the JSON — just refresh the page.

Supported sources:

- MP4 / WebM / Ogg: plain `<video>` playback.
- `.m3u8` (HLS): played with hls.js on all browsers.

Poster images can be JPG/PNG/WebP placed here too, referenced as
`/videos/my-poster.jpg`.

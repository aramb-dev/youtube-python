# YouTube Library Research

## youtubei.js
- **Description**: A wrapper around YouTube's private "InnerTube" API.
- **Pros**:
    - Supports Node.js, Deno, and Bun.
    - Can fetch high-quality metadata and streaming URLs.
    - Actively maintained.
- **Usage**:
    ```javascript
    import { Innertube } from 'youtubei.js';
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
    ```

## @distube/ytdl-core
- **Description**: A fork of the original `ytdl-core` with patches for recent YouTube changes.
- **Pros**: 
    - Pure JS, easy to integrate.
    - Familiar API for those who used `ytdl-core`.
- **Cons**: Still subject to frequent breaking changes by YouTube.

## mediabunny
- **Description**: Browser-based media processing.
- **Note**: Not directly used for downloading, but can be used if we decide to offload some processing to the client. Given our Railway + FFmpeg plan, it is a secondary consideration.

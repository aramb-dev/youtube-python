# Railway & Environment Setup Research

## Deployment: Railway
- **Runtime**: Bun
- **Framework**: Next.js
- **Dependency Strategy**: Mediabunny (JS-native muxing)

### Simplified Deployment
Since we are using **Mediabunny** for muxing, we no longer strictly require a custom Dockerfile to install the `ffmpeg` binary. We can use Railway's default **Nixpacks** or a standard Bun-based deployment.

### Updated Storage Strategy
- **Ephemeral Filesystem**: Railway's `/tmp` directory will still be used for temporary storage of video/audio chunks before they are muxed by Mediabunny.
- **Memory Management**: Since Mediabunny can work with streams, we should aim to pipe data directly through the muxer to minimize disk I/O where possible.

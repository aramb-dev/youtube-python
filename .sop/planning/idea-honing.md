# Idea Honing: YouTube Video Downloader API

This document tracks the requirements clarification process.

## Question 1: Search Functionality
The rough idea mentions "Search and retrieve video information". Should the API support searching YouTube by keywords (returning a list of results), or is the primary goal to "search" (fetch) metadata for a specific YouTube URL provided by the user?

**Answer:** The API will only fetch metadata for a specific YouTube URL provided by the user. Keyword search is not required.

## Question 2: Supported Formats
The requirement says "Support multiple video formats where possible" and "Support only downloadable formats (combined video+audio streams work best)". 
Are we focusing strictly on MP4 (highest quality combined stream, usually 720p or 360p) and MP3 (audio extraction), or should we also consider separate video/audio streams (DASH) which would require server-side merging (e.g., using FFmpeg)?

**Answer:** We will support separate video/audio streams (DASH) and server-side merging to enable higher quality downloads.

## Question 3: Processing & Storage
Merging separate streams (DASH) allows for higher quality (1080p+) but typically requires temporary disk space or complex piping to merge video and audio. The original requirements stated "Stream downloads (no disk storage)".
Are you okay with using temporary disk storage for the merging process, or should we strictly attempt to stream the merge on-the-fly (which may be less reliable and more complex)?

**Answer:** Temporary disk storage is acceptable for the merging process.

## Question 4: Frontend Technology
For the "simple, clean web interface", do you have a preference for the technology stack? 
Should we stick to vanilla HTML/CSS/JavaScript served directly by the Bun server (simplest, no build step), or do you prefer a lightweight framework (like React or Vue) or a server-side templating engine?

**Answer:** The user is open to Next.js, but acceptable to using Vanilla HTML/JS with Bun if simplicity is preferred.

## Question 5: Project Structure & "Simplicity"
I notice you already have a `src/server.js` and `public/index.html` structure. 
To keep the project lightweight and align with the "simple" constraint, would you prefer we build upon this existing structure (Vanilla HTML + Bun), or should we re-initialize the project as a Next.js application (which would replace the current structure)?

**Answer:** Re-initialize the project as a Next.js application.

## Question 6: Environment & Deployment
Since we are using Next.js and potentially FFmpeg for merging, where do you intend to run this application? 
Is it for **local development/personal use** only, or are you planning to **deploy it to a specific platform** (like Vercel, which has strict timeout and serverless limitations for long-running tasks like video processing)?

**Answer:** Deploy to Cloudflare.

## Question 7: Cloudflare & FFmpeg Constraints
Cloudflare (Workers/Pages) runs in an Edge environment that generally does not support spawning child processes (like `ffmpeg` CLI) or writing to a local filesystem, which creates a conflict with the requirement to "merge video/audio server-side".

To resolve this, which approach do you prefer?
1.  **Client-Side Merging:** The server fetches video and audio streams separately, proxies them to the browser, and the browser (using FFmpeg.wasm) handles the merging. (Higher client CPU usage, but fully serverless compatible).
2.  **Change Deployment Target:** Switch to a container-based host (like Fly.io, Railway, or a VPS) that supports full Node.js and FFmpeg.
3.  **Drop Merging:** Only support pre-merged formats (limit to 720p/360p standard MP4s) to ensure Cloudflare compatibility without complex workarounds.

**Answer:** Change deployment target to Railway (container-based), allowing for server-side FFmpeg processing.

## Conclusion
We have established the core requirements:
- **Function:** Fetch metadata and download via URL.
- **Formats:** High-quality merged streams (DASH) via server-side FFmpeg.
- **Stack:** Next.js (re-initialized) on Railway.
- **Storage:** Temporary disk usage is allowed for merging.

Do you feel these requirements are clear enough to proceed to the Research phase, or is there anything else you'd like to clarify (e.g., specific error handling, UI design preferences)?

**Answer:**

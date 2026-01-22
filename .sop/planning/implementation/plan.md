# Implementation Plan: YouTube Video Downloader API

This plan outlines the steps to build the YouTube Video Downloader API using Next.js, Bun, youtubei.js, and Mediabunny. Each step results in a working, demoable increment.

## Implementation Checklist
- [ ] Step 1: Initialize Next.js Project with Bun
- [ ] Step 2: Implement Metadata API Route
- [ ] Step 3: Create Metadata Frontend Interface
- [ ] Step 4: Implement Basic Download (Single Stream)
- [ ] Step 5: Implement DASH Muxing with Mediabunny
- [ ] Step 6: Finalize UI and Progress Handling
- [ ] Step 7: Railway Deployment Preparation

---

## Step 1: Initialize Next.js Project with Bun
**Objective:** Set up a clean Next.js project using Bun and install core dependencies.

**Guidance:**
- Re-initialize the project using `bun create next-app .`.
- Choose TypeScript, Tailwind CSS, and App Router.
- Install `youtubei.js` and `mediabunny`.
- Configure `bunfig.toml` if necessary for the environment.

**Integration:** This is the foundation of the new project structure.

**Demo:** Run `bun run dev` and see the default Next.js landing page.

---

## Step 2: Implement Metadata API Route
**Objective:** Create an API endpoint `/api/metadata` that takes a YouTube URL and returns video info.

**Guidance:**
- Create `src/app/api/metadata/route.ts`.
- Use `youtubei.js` to initialize an `Innertube` instance.
- Call `getInfo(url)` and filter the resulting formats into a clean JSON structure for the frontend.
- Handle basic errors (invalid URL, video not found).

**Integration:** Builds on the Next.js structure from Step 1.

**Demo:** Access `/api/metadata?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ` in the browser or via `curl` and receive a JSON object with video details.

---

## Step 3: Create Metadata Frontend Interface
**Objective:** Build a simple UI to input a URL and display the fetched metadata.

**Guidance:**
- Modify `src/app/page.tsx` to include an input field and a "Fetch Info" button.
- Implement a state to store and display the title, thumbnail, and a table/list of available formats.
- Add basic styling using Tailwind CSS.

**Integration:** Connects to the API route created in Step 2.

**Demo:** Enter a YouTube URL in the UI, click "Fetch Info," and see the video title, thumbnail, and available formats appear on the screen.

---

## Step 4: Implement Basic Download (Single Stream)
**Objective:** Enable downloading of "combined" formats (video+audio in one stream) without muxing.

**Guidance:**
- Create `/api/download/route.ts`.
- Accept a URL and a `formatId`.
- Use `youtubei.js` to get the streaming URL for that specific format.
- Use `fetch` to proxy the stream from YouTube to the user, setting appropriate headers (`Content-Disposition`).

**Integration:** Adds the first functional download capability to the existing UI.

**Demo:** Click a download button for a 360p or 720p "combined" format in the UI and have the file download directly to your computer.

---

## Step 5: Implement DASH Muxing with Mediabunny
**Objective:** Support high-quality downloads by merging separate video and audio streams.

**Guidance:**
- Update the download API to handle cases where separate `videoFormatId` and `audioFormatId` are provided.
- Download the video and audio streams to temporary files in `/tmp`.
- Use `Mediabunny` to mux these files into a single MP4 container.
- Stream the resulting muxed file back to the user and clean up temporary files.

**Integration:** Enhances the download API from Step 4 to support high-quality formats.

**Demo:** Select a 1080p format in the UI, and after a brief processing period, receive a high-quality MP4 file with sound.

---

## Step 6: Finalize UI and Progress Handling
**Objective:** Polish the user experience with loading states, error alerts, and download status.

**Guidance:**
- Add a loading spinner while fetching metadata and during the download/muxing process.
- Implement clear error messages for common failures (e.g., restricted videos).
- Ensure the UI is responsive and "clean."

**Integration:** Wraps the functional components into a cohesive user experience.

**Demo:** A fully functional, polished interface where users can fetch info, see clear loading states, and download any quality video successfully.

---

## Step 7: Railway Deployment Preparation
**Objective:** Ensure the project is ready for Railway with Bun and any necessary environment settings.

**Guidance:**
- Verify that `mediabunny` works without binary dependencies in a clean environment.
- Create or update the `package.json` scripts for Railway.
- Document environment variables if needed (e.g., for YouTube authentication if bot protection is encountered).

**Integration:** Prepares the completed application for production.

**Demo:** The application successfully builds and runs in a local production-like environment (e.g., inside a Bun Docker container).

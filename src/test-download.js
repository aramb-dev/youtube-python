import fs from "fs";
import { Innertube, Platform } from "youtubei.js";
import { createSpinner } from "nanospinner";
import { Readable } from "stream";

// Set up the JavaScript interpreter for URL deciphering BEFORE creating Innertube
Platform.shim.eval = async (data, env) => {
	const properties = [];
	
	if (env.n) {
		properties.push(`n: exportedVars.nFunction("${env.n}")`);
	}
	
	if (env.sig) {
		properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
	}
	
	const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
	return new Function(code)();
};

// Replace with actual video ID
const videoId = "dQw4w9WgXcQ";

// Create Innertube instance
const yt = await Innertube.create({
	retrieve_player: true,
	generate_session_locally: true,
});

const infoSpinner = createSpinner("Fetching video info...").start();
const info = await yt.getInfo(videoId);
const title = info.basic_info?.title || "video";
infoSpinner.success({ text: `Found: ${title}` });

// Download combined video+audio (best quality)
const dlSpinner = createSpinner("Downloading best quality video+audio...").start();

const stream = await info.download({ 
	type: "video+audio",
	quality: "best",
	format: "mp4"
});

const outputFile = `${videoId}.mp4`;
const fileStream = fs.createWriteStream(outputFile);

// Convert Web ReadableStream to Node stream
const reader = stream.getReader();
const nodeStream = new Readable({
	async read() {
		const { done, value } = await reader.read();
		if (done) {
			this.push(null);
		} else {
			this.push(Buffer.from(value));
		}
	}
});

nodeStream.pipe(fileStream);

await new Promise((resolve, reject) => {
	fileStream.on("finish", resolve);
	fileStream.on("error", reject);
});

dlSpinner.success();
console.log(`\n✅ Downloaded: ${outputFile}`);

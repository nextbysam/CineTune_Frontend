import { bundle } from "@remotion/bundler";
import { renderMedia } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	const args = process.argv.slice(2);
	const designArg = args.find((a) => a.startsWith("--design="));
	if (!designArg) {
		process.stderr.write("Missing --design=path\n");
		process.exit(1);
	}
	const designPath = designArg.split("=")[1];
	const raw = await fs.readFile(designPath, "utf-8");
	const { design } = JSON.parse(raw);

	const size = design.size || { width: 1080, height: 1920 };
	const fps = design.fps || 30;
	const durationMs = design.duration || 10000;
	const durationInFrames = Math.ceil((durationMs / 1000) * fps);

	const entry = path.join(process.cwd(), "src", "remotion", "index.tsx");
	const outdir = await fs.mkdtemp(path.join(os.tmpdir(), "remotion-bundle-"));
	const serveUrl = await bundle(entry, { outDir: outdir });

	const outputLocation = path.join(os.tmpdir(), `export_${Date.now()}.mp4`);

	await renderMedia({
		serveUrl,
		composition: {
			id: "TimelineComposition",
			width: size.width,
			height: size.height,
			fps,
			durationInFrames,
			defaultProps: { design },
		},
		codec: "h264",
		outputLocation,
		inputProps: { design },
	});

	process.stdout.write(JSON.stringify({ url: outputLocation }));
}

main().catch((e) => {
	process.stderr.write(String(e?.stack || e));
	process.exit(1);
});

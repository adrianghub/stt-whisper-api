import { Configuration, OpenAIApi } from "openai";
import { Readable } from "stream";
import mic from "mic";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import dotenv from "dotenv";
import fs, { PathLike } from "fs";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Record audio
function recordAudio(filename: PathLike) {
  return new Promise<void>((resolve, reject) => {
    const micInstance = mic({
      rate: "16000",
      channels: "1",
      fileType: "wav",
    });

    const micInputStream = micInstance.getAudioStream();
    const output = fs.createWriteStream(filename);
    const writable = new Readable().wrap(micInputStream);

    console.log("Recording... Press Ctrl+C to stop.");

    writable.pipe(output);

    micInstance.start();

    process.on("SIGINT", () => {
      micInstance.stop();
      console.log("Finished recording");
      resolve();
    });

    micInputStream.on("error", (err: Error) => {
      reject(err);
    });
  });
}

// Transcribe audio
async function transcribeAudio(filename: PathLike) {
  const transcript = await openai.createTranscription(
    fs.createReadStream(filename) as unknown as File,
    "whisper-1"
  );
  return transcript.data.text;
}

// Main function
async function main() {
  const audioFilename = "recorded_audio.wav";
  await recordAudio(audioFilename);
  const transcription = await transcribeAudio(audioFilename);
  console.log("Transcription:", transcription);
}

main();

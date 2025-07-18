import type React from "react";
import { useState, useRef } from "react";
import {
  Upload,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface ConvertedFile {
  blob: Blob;
  name: string;
  url: string;
}

const VideoConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [isLoading, setIsLoading] = useState(false);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<ConvertedFile | null>(
    null
  );
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const ffmpegRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize FFmpeg
  const loadFFmpeg = async () => {
    if (isFFmpegLoaded) return;

    try {
      setIsLoading(true);
      setLogs((prev) => [...prev, "Loading FFmpeg..."]);

      // Dynamically import FFmpeg.wasm
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");

      ffmpegRef.current = new FFmpeg();
      ffmpegRef.current.on("log", ({ message }: { message: string }) => {
        setLogs((prev) => [...prev.slice(-10), message]);
      });

      ffmpegRef.current.on(
        "progress",
        ({ progress: ratio }: { progress: number }) => {
          setProgress(Math.round(ratio * 100));
        }
      );

      // Load FFmpeg with CDN URLs
      await ffmpegRef.current.load({
        coreURL:
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
        wasmURL:
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
        workerURL:
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js",
      });

      setIsFFmpegLoaded(true);
      setLogs((prev) => [...prev, "FFmpeg loaded successfully!"]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load FFmpeg: ${errorMsg}`);
      setLogs((prev) => [...prev, `Error loading FFmpeg: ${errorMsg}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setConvertedFile(null);
      setError("");
      setProgress(0);
      setLogs([]);
    }
  };

  const convertVideo = async () => {
    if (!file || !isFFmpegLoaded) return;

    try {
      setIsLoading(true);
      setError("");
      setProgress(0);
      setLogs((prev) => [...prev, `Starting conversion to ${outputFormat}...`]);

      const { fetchFile } = await import("@ffmpeg/util");
      const ffmpeg = ffmpegRef.current;
      const inputName = `input.${file.name.split(".").pop()}`;
      const outputName = `output.${outputFormat}`;

      // Write input file to FFmpeg file system
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const command = [
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-preset",
        "medium",
        outputName,
      ];

      switch (outputFormat) {
        case "mp4":
          command.push("-c:v", "libx264", "-c:a", "aac", "-preset", "medium");
          break;
        case "webm":
          command.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
          break;
        case "avi":
          command.push("-c:v", "libx264", "-c:a", "mp3");
          break;
        case "mov":
          command.push("-c:v", "libx264", "-c:a", "aac");
          break;
        case "mkv":
          command.push("-c:v", "libx264", "-c:a", "aac");
          break;
        default:
          command.push("-c:v", "libx264", "-c:a", "aac");
      }

      command.push(outputName);

      // Execute conversion
      await ffmpeg.exec(command);

      // Read the output file
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });

      setConvertedFile({
        blob,
        name: `${file.name.split(".")[0]} .  ${outputFormat}`,
        url: URL.createObjectURL(blob),
      });

      setLogs((prev) => [...prev, "Conversion completed successfully!"]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load FFmpeg: ${errorMsg}`);
      setLogs((prev) => [...prev, `Error loading FFmpeg: ${errorMsg}`]);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const downloadFile = () => {
    if (!convertedFile) return;

    const a = document.createElement("a");
    a.href = convertedFile.url;
    a.download = convertedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetConverter = () => {
    setFile(null);
    setConvertedFile(null);
    setError("");
    setProgress(0);
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))}  ${sizes[i]}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Video Converter
        </h1>
        <p className="text-gray-600">
          Convert video files locally in your browser - no cloud required
        </p>
      </div>

      {/* FFmpeg Loading */}
      {!isFFmpegLoaded && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <button
            type="button"
            onClick={loadFFmpeg}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Loading FFmpeg...
              </>
            ) : (
              "Initialize Video Converter"
            )}
          </button>
        </div>
      )}

      {/* File Upload */}
      {isFFmpegLoaded && (
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <Upload className="h-12 w-12 text-gray-400" />
              <span className="text-lg font-medium text-gray-700">
                Choose a video file
              </span>
              <span className="text-sm text-gray-500">
                Supports MP4, MOV, AVI, MKV, WebM and more
              </span>
            </label>
          </div>
        </div>
      )}

      {/* File Info */}
      {file && (
        <div className="mb-6 p-4 bg-green-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{file.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={resetConverter}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Format Selection */}
      {file && (
        <div className="mb-6">
          <label
            htmlFor="output-format"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Output Format
          </label>
          <select
            id="output-format"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg focus:ring-0 focus:ring-blue-500 focus:border-blue-500 "
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
          </select>
        </div>
      )}

      {/* Convert Button */}
      {file && isFFmpegLoaded && (
        <div className="mb-6">
          <button
            type="button"
            onClick={convertVideo}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Converting...
              </>
            ) : (
              "Convert Video"
            )}
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && progress > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Success and Download */}
      {convertedFile && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700 font-medium">
              Conversion completed!
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{convertedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(convertedFile.blob.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadFile}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Processing Logs
          </h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono max-h-40 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConverter;

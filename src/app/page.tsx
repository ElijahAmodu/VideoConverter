"use client";
import Image from "next/image";
import VideoConverter from "./component/videoconverter/videoconverter";

export default function Home() {
  return (
    <div className="p-4 md:p-10">
      <VideoConverter />
    </div>
  );
}

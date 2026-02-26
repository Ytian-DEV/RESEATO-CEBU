import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      {/* IMPORTANT: no max-w wrapper here */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
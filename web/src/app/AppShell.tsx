import { Outlet } from 'react-router-dom';
import Navbar from '../components/layouts/Navbar';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
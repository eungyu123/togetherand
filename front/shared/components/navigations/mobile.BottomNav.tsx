import Link from 'next/link';
import { Home, Users, User } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth';

export default function MobileBottomNav() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <nav className="flex items-center justify-around px-4 py-2 bg-main-black-800 border-t border-main-black-700">
      {/* 매칭 */}
      <Link
        href="/"
        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-main-black-750 transition-colors"
      >
        <Home size={16} className="text-white" />
      </Link>

      {/* 친구 */}

      {isAuthenticated ? (
        <Link
          href="/friends"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-main-black-750 transition-colors"
        >
          <Users size={16} className="text-white" />
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-main-black-750 transition-colors opacity-50 select-none">
          <Users size={16} className="text-white" />
        </div>
      )}

      {/* 계정 */}
      {isAuthenticated ? (
        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-main-black-750 transition-colors"
        >
          <User size={16} className="text-white" />
        </Link>
      ) : (
        <Link href="/auth/signin" className="flex flex-col items-center gap-1 p-2 rounded-lg">
          <User size={16} className="text-white" />
        </Link>
      )}
    </nav>
  );
}

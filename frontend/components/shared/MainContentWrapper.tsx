'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const pathname = usePathname();

    const isLanding = pathname === '/';
    const isAuth = pathname.startsWith('/auth');
    const showSideNav = !isLanding && !isAuth && !!user;

    return (
        <main className={clsx(
            'flex-1 min-w-0 transition-all duration-300',
            showSideNav ? 'lg:ml-64' : 'lg:ml-0'
        )}>
            <div className="page-enter">
                {children}
            </div>
        </main>
    );
}

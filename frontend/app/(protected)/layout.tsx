'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Menu, X, LogOut } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Resumes', href: '/resumes' },
    { name: 'Jobs', href: '/jobs' },
    { name: 'Applications', href: '/applications' },
    { name: 'Automation', href: '/automation' },
  ];

  const isActive = (href: string) => pathname === href;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-mobile-menu-button]')
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    logout(pathname);
  };

  const userDisplayName = user?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-600">JobNeuron</h1>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop User Icon with Dropdown */}
            <div className="hidden md:flex md:items-center">
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  aria-label="User menu"
                >
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="User"
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {userDisplayName}
                        </p>
                        {user?.email && (
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center md:hidden">
              <button
                data-mobile-menu-button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-40"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                // backdropFilter: 'blur(20px) saturate(180%)',
                // WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              ref={mobileMenuRef}
              className="fixed inset-y-0 left-0 w-full sm:w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out"
            >
              <div className="flex flex-col h-full">
                {/* User Info Section */}
                <div className="px-4 py-6 border-b border-gray-200 bg-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {user?.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt="User"
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {userDisplayName}
                        </p>
                        {user?.email && (
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="ml-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>

                {/* Logout Button */}
                <div className="px-2 py-4 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main>{children}</main>
    </div>
  );
}

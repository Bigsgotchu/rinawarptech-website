'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              RinaWarp Terminal
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-gray-900"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-gray-600 hover:text-gray-900"
            >
              Pricing
            </button>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            <Link href="/support" className="text-gray-600 hover:text-gray-900">Support</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            <Link
              href="/download"
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Download
            </Link>
          </div>

          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
              <div className="px-4 py-2 space-y-2">
                <button
                  onClick={() => {
                    scrollToSection('features');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-gray-600 hover:text-gray-900"
                >
                  Features
                </button>
                <button
                  onClick={() => {
                    scrollToSection('pricing');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-gray-600 hover:text-gray-900"
                >
                  Pricing
                </button>
                <Link href="/docs" className="block py-2 text-gray-600 hover:text-gray-900">Docs</Link>
                <Link href="/support" className="block py-2 text-gray-600 hover:text-gray-900">Support</Link>
                <Link href="/contact" className="block py-2 text-gray-600 hover:text-gray-900">Contact</Link>
                <Link
                  href="/download"
                  className="block py-2 bg-primary text-white px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Download
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

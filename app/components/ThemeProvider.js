'use client';
import { useEffect } from 'react';

export default function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem('torchd-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);
  return null;
}
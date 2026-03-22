'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FeedbackModal from '@/components/FeedbackModal';
import { I18nProvider } from '@/contexts/I18nContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar onFeedbackClick={() => setFeedbackOpen(true)} />
            <main style={{ flex: 1 }}>
              {children}
            </main>
            <Footer />
            <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
          </div>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

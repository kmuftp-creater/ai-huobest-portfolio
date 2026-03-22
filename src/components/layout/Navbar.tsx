'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useI18n, LOCALE_LABELS, Locale } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Menu, X, Sun, Moon, Globe, MessageSquare, LogIn, LogOut } from 'lucide-react';
import styles from './Navbar.module.css';

interface NavbarProps {
  onFeedbackClick: () => void;
}

export default function Navbar({ onFeedbackClick }: NavbarProps) {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [userDisplay, setUserDisplay] = useState<string | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setUserDisplay(null); return; }
    const supabase = getSupabaseClient();
    supabase.from('profiles').select('username').eq('id', user.id).single().then(({ data: prof }) => {
      const name = prof?.username
        ?? user.user_metadata?.full_name
        ?? user.user_metadata?.name
        ?? user.email?.split('@')[0]
        ?? null;
      setUserDisplay(name);
    });
  }, [user]);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/about', label: t('nav.about') },
    { href: '/projects', label: t('nav.projects') },
    { href: '/prompts', label: t('nav.prompts') },
    { href: '/skills', label: t('nav.skills') },
    { href: '/workshop', label: t('nav.workshop') },
    { href: '/community', label: '交流討論' },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      /* silent */
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Brand */}
        <Link href="/" className={styles.brand}>
          <span className={styles.brandText}>霍 の AI 腦洞實驗室</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.desktopNav}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Theme Toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            {theme === 'light' ? (
              <>
                <Moon size={16} className={styles.themeIcon} />
                <span className={styles.themeLabel}>{t('theme.dark')}</span>
              </>
            ) : (
              <>
                <Sun size={16} className={styles.themeIconSun} />
                <span className={styles.themeLabel}>{t('theme.light')}</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <div className={styles.langWrapper} ref={langRef}>
            <button
              className={styles.langBtn}
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-label="Switch language"
            >
              <Globe size={16} />
              <span className={styles.langCurrent}>
                {LOCALE_LABELS[locale].substring(0, 2)}
              </span>
            </button>
            {langDropdownOpen && (
              <div className={styles.langDropdown}>
                {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.langOption} ${locale === key ? styles.langActive : ''}`}
                    onClick={() => {
                      setLocale(key);
                      setLangDropdownOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Google Login / User */}
          {userDisplay ? (
            <div className={styles.userMenu}>
              <Link href="/profile" className={styles.userBtn} title="會員中心">
                <LogIn size={15} />
                <span className={styles.googleLoginLabel} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userDisplay}
                </span>
              </Link>
              <button
                className={styles.logoutIconBtn}
                onClick={signOut}
                title="登出"
                aria-label="登出"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className={styles.googleLoginBtn}
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              aria-label="Google 登入"
              title="使用 Google 帳號登入"
            >
              <LogIn size={15} />
              <span className={styles.googleLoginLabel}>登入</span>
            </button>
          )}

          {/* Feedback Button */}
          <button className={styles.feedbackBtn} onClick={onFeedbackClick} aria-label="Feedback">
            <MessageSquare size={16} />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

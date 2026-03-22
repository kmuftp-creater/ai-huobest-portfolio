'use client';

import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { X, Send } from 'lucide-react';
import styles from './FeedbackModal.module.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useI18n();
  const [type, setType] = useState('feature');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    
    try {
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.from('feedback').insert({
        type,
        title,
        detail,
        email: email || null
      });

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTitle('');
        setDetail('');
        setEmail('');
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error('Error submitting feedback:', err);
      // 詳細顯示錯誤內容，避免出現 [object Object]
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      if (errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
        alert('提交失敗：資料庫尚未建立 feedback 表。請聯絡管理員執行建表 SQL。');
      } else {
        alert(`提交失敗：${errorMsg}`);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('feedback.title')}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className={styles.success}>
            <span className={styles.successIcon}>✅</span>
            <p>{t('feedback.success')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('feedback.type')}</label>
              <select
                className="input"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="feature">{t('feedback.type_feature')}</option>
                <option value="bug">{t('feedback.type_bug')}</option>
                <option value="usage">{t('feedback.type_usage')}</option>
                <option value="course">{t('feedback.type_course')}</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('feedback.label_title')}</label>
              <input
                className="input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('feedback.label_detail')}</label>
              <textarea
                className="input textarea"
                value={detail}
                onChange={e => setDetail(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('feedback.label_email')}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t('feedback.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={16} />
                {t('feedback.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

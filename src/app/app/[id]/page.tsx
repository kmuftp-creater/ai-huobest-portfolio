import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Try projects table first (new), then shared_projects (legacy)
  let html_code: string | null = null;
  let title = '';

  const { data: project } = await supabase
    .from('projects')
    .select('title, html_code, embed_type, status')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (project && project.embed_type === 'html' && project.html_code) {
    html_code = project.html_code;
    title = project.title;
  } else {
    const { data: shared } = await supabase
      .from('shared_projects')
      .select('title, html_code, embed_type, status')
      .eq('id', id)
      .eq('status', 'published')
      .single();
    if (shared && shared.embed_type === 'html' && shared.html_code) {
      html_code = shared.html_code;
      title = shared.title;
    }
  }

  if (!html_code) notFound();

  return (
    <html style={{ margin: 0, padding: 0, height: '100%' }}>
      <body style={{ margin: 0, padding: 0, height: '100%' }}>
        <iframe
          srcDoc={html_code}
          title={title}
          style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </body>
    </html>
  );
}

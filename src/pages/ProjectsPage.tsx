import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { projects, type Project } from '../api/render';
import { useRouter } from '../state/router';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';
import { timeAgo } from '../ui/helpers';

export default function ProjectsPage() {
  const router = useRouter();
  const app = useApp();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    projects.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="Projects" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {!loading && items.length === 0 && <div className="empty"><div className="ico">🗂️</div><div className="title">Sin projects</div></div>}
          {items.map(p => (
            <div key={p.id} className="card-row" onClick={() => router.push({ name: 'project', id: p.id })}>
              <div style={{ fontSize: 18 }}>🗂️</div>
              <div className="body"><div className="title">{p.name}</div><div className="sub">creado {timeAgo(p.createdAt)}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

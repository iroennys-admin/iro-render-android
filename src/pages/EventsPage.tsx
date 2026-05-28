import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, type ServiceEvent } from '../api/render';
import { toast } from '../ui/Toast';
import { timeAgo } from '../ui/helpers';

export default function EventsPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<ServiceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    services.events(serviceId, { limit: 100 }).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [serviceId]);
  return (
    <>
      <TopBar title="Eventos" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.map(e => (
            <div key={e.id} className="card">
              <div className="strong small">{e.type}</div>
              <div className="muted tiny">{timeAgo(e.timestamp)} · {new Date(e.timestamp).toLocaleString()}</div>
              {e.details && Object.keys(e.details).length > 0 && (
                <pre className="mt-2 small mono" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(e.details, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

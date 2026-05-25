import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function WebhookDetail() {
  const { id } = useParams();
  const [webhook, setWebhook] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [wRes, eRes] = await Promise.all([
        api.get(`/webhooks/${id}`),
        api.get(`/events/webhook/${id}`),
      ]);
      setWebhook(wRes.data);
      setEvents(eRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!webhook) return <div className="page-loading">Webhook not found</div>;

  const statusColor = { delivered: '#22c55e', failed: '#ef4444', pending: '#f59e0b' };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
          <h2>Webhook Detail</h2>
          <p className="subtitle">{webhook.sourceUrl}</p>
        </div>
        <span className={`wh-status ${webhook.status}`}>{webhook.status}</span>
      </div>

      <div className="detail-card">
        <div className="detail-row"><strong>Source URL</strong><span>{webhook.sourceUrl}</span></div>
        <div className="detail-row"><strong>Callback URL</strong><span>{webhook.callbackUrl}</span></div>
        <div className="detail-row"><strong>Status</strong><span>{webhook.status}</span></div>
        <div className="detail-row"><strong>Events Received</strong><span>{webhook.totalEventsReceived}</span></div>
        <div className="detail-row"><strong>Failed Deliveries</strong><span>{webhook.failedDeliveries}</span></div>
        <div className="detail-row">
          <strong>Secret</strong>
          <code>{webhook.secret}</code>
        </div>
        <div className="detail-row">
          <strong>POST Endpoint</strong>
          <code>{`http://localhost:4000/api/webhooks/${webhook._id}/events`}</code>
        </div>
      </div>

      <div className="event-log">
        <h3>Event History ({events.length})</h3>
        {events.length === 0 ? (
          <div className="empty-state">No events received yet for this webhook.</div>
        ) : (
          events.map(ev => (
            <div key={ev._id} className="event-item">
              <div className="event-header">
                <span className="event-type">{ev.eventType}</span>
                <span className="event-status" style={{ color: statusColor[ev.status] }}>
                  ● {ev.status}
                </span>
                <span className="event-time">{new Date(ev.createdAt).toLocaleString()}</span>
              </div>
              <pre className="event-payload">{JSON.stringify(ev.payload, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

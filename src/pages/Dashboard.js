import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function SubscribeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ sourceUrl: '', callbackUrl: '', eventTypes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        sourceUrl: form.sourceUrl,
        callbackUrl: form.callbackUrl,
        eventTypes: form.eventTypes ? form.eventTypes.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const { data } = await api.post('/webhooks/subscribe', payload);
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Subscribe to Webhook</h3>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Source URL <span className="hint">(where events come from)</span></label>
          <input
            type="url"
            value={form.sourceUrl}
            onChange={e => setForm({ ...form, sourceUrl: e.target.value })}
            placeholder="https://api.github.com"
            required
          />
          <label>Callback URL <span className="hint">(where to forward events)</span></label>
          <input
            type="url"
            value={form.callbackUrl}
            onChange={e => setForm({ ...form, callbackUrl: e.target.value })}
            placeholder="https://yourserver.com/callback"
            required
          />
          <label>Event Types <span className="hint">(optional, comma-separated)</span></label>
          <input
            value={form.eventTypes}
            onChange={e => setForm({ ...form, eventTypes: e.target.value })}
            placeholder="push, pull_request, issue"
          />
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventLog({ events }) {
  const statusColor = { delivered: '#22c55e', failed: '#ef4444', pending: '#f59e0b' };

  return (
    <div className="event-log">
      <h3>Live Event Log</h3>
      {events.length === 0 ? (
        <div className="empty-state">No events yet. Send some webhook events!</div>
      ) : (
        <div className="event-list">
          {events.map(ev => (
            <div key={ev._id} className="event-item">
              <div className="event-header">
                <span className="event-type">{ev.eventType}</span>
                <span className="event-status" style={{ color: statusColor[ev.status] }}>
                  ● {ev.status}
                </span>
                <span className="event-time">{new Date(ev.createdAt).toLocaleTimeString()}</span>
              </div>
              <pre className="event-payload">{JSON.stringify(ev.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ user }) {
  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [wRes, eRes] = await Promise.all([api.get('/webhooks'), api.get('/events')]);
      setWebhooks(wRes.data);
      setEvents(eRes.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for real-time-ish updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this webhook subscription?')) return;
    await api.delete(`/webhooks/${id}`);
    fetchData();
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Welcome, {user?.name} 👋</h2>
          <p className="subtitle">{webhooks.length} active webhook{webhooks.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Subscribe</button>
      </div>

      <div className="webhooks-grid">
        {webhooks.length === 0 ? (
          <div className="empty-state full-width">
            No webhooks yet. Click <strong>+ Subscribe</strong> to add one.
          </div>
        ) : (
          webhooks.map(wh => (
            <div key={wh._id} className={`webhook-card ${wh.status === 'cancelled' ? 'cancelled' : ''}`}>
              <div className="wh-header">
                <span className={`wh-status ${wh.status}`}>{wh.status}</span>
                <span className="wh-events">{wh.totalEventsReceived} events</span>
              </div>
              <div className="wh-source">{wh.sourceUrl}</div>
              <div className="wh-callback">→ {wh.callbackUrl}</div>
              {wh.eventTypes?.length > 0 && (
                <div className="wh-types">
                  {wh.eventTypes.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
              <div className="wh-secret">
                <code>Secret: {wh.secret?.substring(0, 12)}...</code>
              </div>
              <div className="wh-actions">
                <Link to={`/webhook/${wh._id}`} className="btn-link">View Events</Link>
                {wh.status === 'active' && (
                  <button className="btn-danger" onClick={() => handleCancel(wh._id)}>Cancel</button>
                )}
              </div>
              <div className="wh-endpoint">
                <strong>POST endpoint:</strong>
                <code>{`http://localhost:4000/api/webhooks/${wh._id}/events`}</code>
              </div>
            </div>
          ))
        )}
      </div>

      <EventLog events={events} />

      {showModal && (
        <SubscribeModal
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  );
}

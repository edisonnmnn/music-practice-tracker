import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"User"}');
  
  // State
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    instrument: '',
    duration: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    notes: ''
  });

  // Load sessions and stats on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, statsRes] = await Promise.all([
        sessionsAPI.getAll(),
        sessionsAPI.getStats()
      ]);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await sessionsAPI.create({
        instrument: formData.instrument,
        duration: parseInt(formData.duration),
        date: formData.date,
        notes: formData.notes
      });
      
      // Reset form
      setFormData({
        instrument: '',
        duration: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowForm(false);
      
      // Reload data
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this practice session?')) return;
    
    try {
      await sessionsAPI.delete(id);
      loadData();
    } catch (err) {
      setError('Failed to delete session');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="dashboard">Loading...</div>;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>🎵 Practice Tracker</h1>
          <p>Welcome back, {user.name}!</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          Logout
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Sessions</h3>
            <p className="stat-number">{stats.totalSessions}</p>
          </div>
          <div className="stat-card">
            <h3>Total Minutes</h3>
            <p className="stat-number">{stats.totalMinutes}</p>
          </div>
          <div className="stat-card">
            <h3>Total Hours</h3>
            <p className="stat-number">{stats.totalHours}</p>
          </div>
        </div>
      )}

      {/* Add Session Button */}
      <div className="actions">
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Practice Session'}
        </button>
      </div>

      {/* Add Session Form */}
      {showForm && (
        <div className="session-form">
          <h2>Log Practice Session</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Instrument</label>
                <input
                  type="text"
                  value={formData.instrument}
                  onChange={(e) => setFormData({...formData, instrument: e.target.value})}
                  placeholder="Piano, Guitar, Violin..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  min="1"
                  placeholder="30"
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="What did you practice today?"
                rows="3"
              />
            </div>
            <button type="submit" className="btn-primary">
              Save Session
            </button>
          </form>
        </div>
      )}

      {/* Sessions List */}
      <div className="sessions-section">
        <h2>Recent Practice Sessions</h2>
        {sessions.length === 0 ? (
          <p className="empty-state">No practice sessions yet. Add your first one above!</p>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <h3>{session.instrument}</h3>
                  <button 
                    onClick={() => handleDelete(session.id)}
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                </div>
                <div className="session-info">
                  <span>⏱️ {session.duration} minutes</span>
                  <span>📅 {new Date(session.date).toLocaleDateString()}</span>
                </div>
                {session.notes && (
                  <p className="session-notes">{session.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
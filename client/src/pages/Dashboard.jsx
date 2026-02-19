import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import Calendar from 'react-calendar';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import 'react-calendar/dist/Calendar.css';
import './Dashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"User"}');
  
  // State
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formData, setFormData] = useState({
    instrument: '',
    duration: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Filter state
  const [filters, setFilters] = useState({
    instrument: '',
    startDate: '',
    endDate: ''
  });

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Goal state
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
  const saved = localStorage.getItem('weeklyGoal');
  return saved ? parseInt(saved) : 300; // Default 5 hours
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(weeklyGoal);
  // Load sessions and stats on mount
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [sessions, filters]);

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

  const applyFilters = () => {
    let filtered = [...sessions];

    if (filters.instrument) {
      filtered = filtered.filter(s => 
        s.instrument.toLowerCase().includes(filters.instrument.toLowerCase())
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(s => s.date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter(s => s.date <= filters.endDate);
    }

    setFilteredSessions(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const sessionData = {
        instrument: formData.instrument,
        duration: parseInt(formData.duration),
        date: formData.date,
        notes: formData.notes
      };

      if (editingSession) {
        await sessionsAPI.update(editingSession.id, sessionData);
      } else {
        await sessionsAPI.create(sessionData);
      }
      
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save session');
    }
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      instrument: session.instrument,
      duration: session.duration.toString(),
      date: session.date.split('T')[0],
      notes: session.notes || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const resetForm = () => {
    setFormData({
      instrument: '',
      duration: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowForm(false);
    setEditingSession(null);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Instrument', 'Duration (min)', 'Notes'];
    const rows = filteredSessions.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.instrument,
      s.duration,
      s.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Handle goal 
  const handleSaveGoal = () => {
    if (tempGoal && tempGoal > 0) {
      setWeeklyGoal(tempGoal);
      localStorage.setItem('weeklyGoal', tempGoal.toString());
      setEditingGoal(false);
    }
  };

  const handleCancelGoal = () => {
    setTempGoal(weeklyGoal);
    setEditingGoal(false);
  };

  // Get weekly stats (last 7 days)
  const getWeeklyStats = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekAgo && sessionDate <= today;
    });

    const totalMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    return { totalMinutes, totalSessions: weekSessions.length };
  };

  // Get sessions for calendar date
  const getSessionsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessions.filter(s => s.date.startsWith(dateStr));
  };

  // Prepare chart data
  const getChartData = () => {
    if (!stats || !stats.practiceByDate) return null;

    const sortedData = [...stats.practiceByDate].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const last30 = sortedData.slice(-30);

    return {
      labels: last30.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Practice Minutes',
          data: last30.map(d => d.minutes),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Practice Trend (Last 30 Days)',
        font: { size: 16, weight: 'bold' }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Minutes' }
      }
    }
  };

  const weeklyStats = getWeeklyStats();
  const weeklyProgress = Math.min((weeklyStats.totalMinutes / weeklyGoal) * 100, 100);

  if (loading) {
    return <div className="dashboard">Loading...</div>;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Personal Practice Tracker</h1>
          <p>Welcome back, {user.name}!</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          Logout
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'calendar' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button 
          className={activeTab === 'stats' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="stat-card weekly">
              <h3>This Week</h3>
              <p className="stat-number">{Math.round(weeklyStats.totalMinutes / 60 * 10) / 10}h</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${weeklyProgress}%`}}
                ></div>
              </div>
              <div className="goal-controls">
                {editingGoal ? (
                  <div className="goal-edit">
                    <input
                      type="number"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)}
                      min="1"
                      className="goal-input"
                    />
                    <button onClick={handleSaveGoal} className="btn-goal-save">Save</button>
                    <button onClick={handleCancelGoal} className="btn-goal-cancel">Cancel</button>
                  </div>
                ) : (
                  <p className="progress-text">
                    {weeklyStats.totalMinutes} / {weeklyGoal} min
                    <button 
                      onClick={() => {
                        setTempGoal(weeklyGoal);
                        setEditingGoal(true);
                      }} 
                      className="btn-edit-goal"
                      title="Edit goal"
                    >
                      Edit Goal
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="actions">
            <button 
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }} 
              className="btn-primary"
            >
              {showForm ? 'Cancel' : '+ Add Practice Session'}
            </button>
            <button onClick={exportToCSV} className="btn-secondary">
              Export CSV
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="session-form">
              <h2>{editingSession ? 'Edit Session' : 'Log Practice Session'}</h2>
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
                <button type="submit" className="btn-primary btn-update">
                  {editingSession ? 'Update Session' : 'Save Session'}
                </button>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="🔍 Filter by instrument..."
              value={filters.instrument}
              onChange={(e) => setFilters({...filters, instrument: e.target.value})}
              className="filter-input"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="filter-input"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="filter-input"
            />
            {(filters.instrument || filters.startDate || filters.endDate) && (
              <button 
                onClick={() => setFilters({instrument: '', startDate: '', endDate: ''})}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sessions List */}
          <div className="sessions-section">
            <h2> Practice Sessions ({filteredSessions.length})</h2>
            {filteredSessions.length === 0 ? (
              <p className="empty-state">
                {sessions.length === 0 
                  ? 'No practice sessions yet. Add your first one above!' 
                  : 'No sessions match your filters.'}
              </p>
            ) : (
              <div className="sessions-list">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <h3>{session.instrument}</h3>
                      <div className="session-buttons">
                        <button 
                          onClick={() => handleEdit(session)}
                          className="btn-edit"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="btn-delete"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
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
        </>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="calendar-view">
          <div className="calendar-container">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={({ date }) => {
                const daySessions = getSessionsForDate(date);
                const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
                
                if (totalMinutes > 0) {
                  return <div className="calendar-badge">{totalMinutes}m</div>;
                }
                return null;
              }}
              tileClassName={({ date }) => {
                const daySessions = getSessionsForDate(date);
                return daySessions.length > 0 ? 'has-sessions' : '';
              }}
            />
          </div>
          
          <div className="calendar-sessions">
            <h3>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            {getSessionsForDate(selectedDate).length === 0 ? (
              <p className="empty-state">No practice sessions on this day.</p>
            ) : (
              <div className="sessions-list">
                {getSessionsForDate(selectedDate).map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <h3>{session.instrument}</h3>
                      <div className="session-buttons">
                        <button 
                          onClick={() => handleEdit(session)}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="session-info">
                      <span>⏱️ {session.duration} minutes</span>
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
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="stats-view">
          {getChartData() && (
            <div className="chart-container">
              <Line data={getChartData()} options={chartOptions} />
            </div>
          )}

          <div className="stats-details">
            <div className="stats-header">
              <h2>Practice Breakdown by Instrument</h2>
            </div>
            <div className="breakdown-section">
              {Object.entries(
                sessions.reduce((acc, s) => {
                  acc[s.instrument] = (acc[s.instrument] || 0) + s.duration;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([instrument, minutes]) => (
                  <div key={instrument} className="breakdown-item">
                    <span className="breakdown-label">{instrument}</span>
                    <div className="breakdown-bar-container">
                      <div 
                        className="breakdown-bar"
                        style={{width: `${(minutes / stats.totalMinutes) * 100}%`}}
                      ></div>
                    </div>
                    <span className="breakdown-value">
                      {Math.round(minutes / 60 * 10) / 10}h ({minutes}m)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
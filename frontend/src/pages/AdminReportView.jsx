import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { auth } from '../services/auth';
import RiskBadge from '../components/RiskBadge';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import {
  FileText,
  User,
  BookOpen,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Printer,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const INITIAL_GALLERY_LIMIT = 12;

export default function AdminReportView({ attemptId, onBack, currentUser }) {
  const user = currentUser || auth.getUser();
  const isAdmin = user?.role === 'admin' || auth.isAdmin();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [galleryLimit, setGalleryLimit] = useState(INITIAL_GALLERY_LIMIT);

  // Normalise UTC ISO strings (with or without trailing Z) → local time
  const formatTime = (ts) => {
    if (!ts) return '—';
    // If no timezone suffix, treat as UTC by appending Z
    const normalized = /[Zz]$|[+\-]\d{2}:\d{2}$/.test(ts) ? ts : ts + 'Z';
    return new Date(normalized).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };


  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await api.get(`/admin/reports/${attemptId}`);
        setReport(res);
      } catch (err) {
        console.error('Failed to load attempt report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading comprehensive proctoring report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem' }}>
        <div>Report could not be retrieved.</div>
        <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const { student_info, exam_info, proctoring_summary } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="main-content" style={{ maxWidth: '1080px' }}>
      {/* Top Controls */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={15} /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Main Audit Document Container */}
      <div className="glass-card" style={{ padding: '2.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid #475569' }}>
        {/* Document Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Official Examination Audit & Integrity Report
            </div>
            <h1 style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>SmartProctor AI Assessment Audit</h1>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Attempt Record ID: {report.attempt_id}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '0.4rem' }}>
              <span className={`badge ${
                proctoring_summary.final_status === 'NORMAL' ? 'badge-low' : (
                  proctoring_summary.final_status === 'REVIEW_REQUIRED' ? 'badge-med' : 'badge-high'
                )
              }`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                STATUS: {proctoring_summary.final_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Report Generated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* 1. Student Information */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
            <User size={18} /> 1. Candidate Information
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            backgroundColor: 'var(--bg-primary)',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Full Candidate Name</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{student_info.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student / Roll ID</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{student_info.student_id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Institutional Email</div>
              <div style={{ fontSize: '0.95rem' }}>{student_info.email || 'student@proctor.edu'}</div>
            </div>
          </div>
        </div>

        {/* 2. Examination Performance */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
            <BookOpen size={18} /> 2. Academic Performance & Time Audit
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            backgroundColor: 'var(--bg-primary)',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Course Title</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{exam_info.title}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Questions Answered</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {exam_info.attempted_questions} / {exam_info.total_questions} ({exam_info.unanswered_questions} unanswered)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Final Marks Score</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: exam_info.passed ? '#10b981' : '#ef4444' }}>
                {exam_info.score_obtained} / {exam_info.max_score} ({exam_info.percentage}%)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Academic Evaluation</div>
              <div style={{ marginTop: '3px' }}>
                <span className={`badge ${exam_info.passed ? 'badge-low' : 'badge-high'}`}>
                  {exam_info.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI Proctoring Analytics */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
            <ShieldAlert size={18} /> 3. AI Automated Proctoring Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            backgroundColor: 'var(--bg-primary)',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cumulative Suspicion Score</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: proctoring_summary.suspicion_score >= 60 ? '#ef4444' : (proctoring_summary.suspicion_score >= 30 ? '#f59e0b' : '#10b981') }}>
                {proctoring_summary.suspicion_score} pts
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Proctor Risk Classification</div>
              <div style={{ marginTop: '4px' }}>
                <RiskBadge score={proctoring_summary.suspicion_score} level={proctoring_summary.risk_level} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Flagged Incidents</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{proctoring_summary.total_events}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>High-Risk Anomaly Triggers</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fca5a5' }}>{proctoring_summary.high_risk_events}</div>
            </div>
          </div>

          {/* Event Breakdown Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {Object.entries(proctoring_summary.event_breakdown || {}).map(([type, count]) => (
              <div
                key={type}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ fontWeight: 600 }}>{type.replace(/_/g, ' ')}:</span>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>



        {/* 4. Incident Evidence Snapshot Gallery - HIDDEN ON PRINT/PDF */}
        {isAdmin && proctoring_summary.evidence_gallery?.length > 0 && (
          <div className="no-print" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
              <ImageIcon size={18} /> 4. Incident Evidence Snapshot Gallery
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
                ({proctoring_summary.evidence_gallery.length > galleryLimit
                  ? `Showing ${Math.min(galleryLimit, proctoring_summary.evidence_gallery.length)} of ${proctoring_summary.evidence_gallery.length}`
                  : `${proctoring_summary.evidence_gallery.length} captures`})
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Download size={11} /> Hidden in PDF export
              </span>
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '0.85rem'
            }}>
              {proctoring_summary.evidence_gallery.slice(0, galleryLimit).map((ev, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEvidence({ ...ev })}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ height: '130px', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={ev.image_url}
                      alt={`Evidence ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                    {/* Index badge */}
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px'
                    }}>#{idx + 1}</span>
                    {/* Hover overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(59,130,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.15s ease'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                    >
                      <ImageIcon size={22} color="#fff" />
                    </div>
                  </div>
                  {/* Caption */}
                  <div style={{ padding: '0.55rem 0.65rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fca5a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(ev.event_type || 'INCIDENT').replace(/_/g, ' ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatTime(ev.timestamp)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>
                        +{ev.points || ev.suspicion_points || 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View More / Show All / Show Less Controls */}
            {proctoring_summary.evidence_gallery.length > INITIAL_GALLERY_LIMIT && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                {galleryLimit < proctoring_summary.evidence_gallery.length ? (
                  <>
                    <button
                      onClick={() => setGalleryLimit(prev => Math.min(prev + 12, proctoring_summary.evidence_gallery.length))}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 1.1rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <ChevronDown size={15} />
                      View More ({proctoring_summary.evidence_gallery.length - galleryLimit} remaining)
                    </button>
                    <button
                      onClick={() => setGalleryLimit(proctoring_summary.evidence_gallery.length)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.8rem',
                        color: 'var(--accent-blue)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Show All ({proctoring_summary.evidence_gallery.length})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setGalleryLimit(INITIAL_GALLERY_LIMIT)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 1.1rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronUp size={15} />
                    Show Less (Back to {INITIAL_GALLERY_LIMIT})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Chronological Audit Log Timeline - ADMIN ONLY */}
        {isAdmin && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
              <Clock size={18} /> <span className="hide-on-print">5</span><span className="show-on-print">4</span>. Chronological Incident Timeline
            </h3>
            <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Flagged Anomaly</th>
                    <th>Points</th>
                    <th>Confidence</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {proctoring_summary.events_timeline?.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No suspicious incidents flagged during this session.
                      </td>
                    </tr>
                  ) : (
                    proctoring_summary.events_timeline?.map((ev, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {formatTime(ev.timestamp)}
                        </td>
                        <td style={{ fontWeight: 600, color: '#fca5a5' }}>
                          {ev.event_type.replace(/_/g, ' ')}
                          {ev.is_demo && <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: '#6ee7b7' }}>[DEMO SIMULATION]</span>}
                        </td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          +{ev.suspicion_points || 0}
                        </td>
                        <td>{Math.round((ev.confidence || 0.9) * 100)}%</td>
                        <td>
                          {ev.evidence_image ? (
                            <button
                              onClick={() => setSelectedEvidence({ ...ev, image_url: ev.evidence_image })}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                            >
                              View Capture
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <strong>Legal & Integrity Notice:</strong> {report.disclaimer}
        </div>
      </div>

      {/* Evidence Viewer Modal - ADMIN ONLY */}
      {isAdmin && selectedEvidence && (
        <EvidenceViewerModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
}

/**
 * Home Page
 * Landing page with venue selection
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Venue } from '../types';
import { venueApi } from '../lib/api';

export default function HomePage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const data = await venueApi.getAll();
      setVenues(data);
    } catch (error) {
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>NaviO - Indoor Navigation</title>
        <meta name="description" content="Navigate indoor spaces with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="home-page">
        <header className="header">
          <div className="logo">🧭 NaviO</div>
          <button className="admin-link" onClick={() => router.push('/admin')}>
            Admin
          </button>
        </header>

        <main className="main">
          <h1>Find Your Way</h1>
          <p className="subtitle">Navigate indoor venues with QR-code positioning</p>

          {loading ? (
            <div className="loading">Loading venues...</div>
          ) : venues.length === 0 ? (
            <div className="empty">
              <p>No venues available.</p>
              <button className="btn btn-primary" onClick={() => router.push('/admin')}>
                Create Venue
              </button>
            </div>
          ) : (
            <div className="venue-grid">
              {venues.map(venue => (
                <div
                  key={venue.id}
                  className="venue-card"
                  onClick={() => router.push(`/venue/${venue.id}`)}
                >
                  <div className="venue-icon">📍</div>
                  <h3>{venue.name}</h3>
                  <button className="btn btn-secondary">Navigate</button>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="footer">
          <p>Powered by NaviO Indoor Navigation System</p>
        </footer>
      </div>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .header {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 24px;
          font-weight: bold;
          color: white;
        }

        .admin-link {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
        }

        .admin-link:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .main {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          text-align: center;
        }

        h1 {
          font-size: 48px;
          color: white;
          margin: 0 0 16px 0;
        }

        .subtitle {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 48px 0;
        }

        .loading,
        .empty {
          color: white;
          font-size: 18px;
          padding: 40px;
        }

        .empty p {
          margin-bottom: 20px;
        }

        .venue-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          margin-top: 40px;
        }

        .venue-card {
          background: white;
          border-radius: 16px;
          padding: 32px 24px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .venue-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
        }

        .venue-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .venue-card h3 {
          margin: 0 0 20px 0;
          font-size: 24px;
          color: #111827;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: white;
          color: #667eea;
        }

        .btn-primary:hover {
          background: #f3f4f6;
        }

        .btn-secondary {
          background: #667eea;
          color: white;
          width: 100%;
        }

        .btn-secondary:hover {
          background: #5568d3;
        }

        .footer {
          padding: 20px;
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
        }

        .footer p {
          margin: 0;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 36px;
          }

          .subtitle {
            font-size: 18px;
          }

          .venue-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

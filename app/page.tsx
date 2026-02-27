'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/types';

const DISTRICTS = [
  'Kohima', 'Dimapur', 'Mokokchung', 'Mon', 'Tuensang', 'Wokha', 'Phek', 'Zunheboto',
  'Peren', 'Longleng', 'Kiphire', 'Noklak', 'Shamator', 'Tseminyü', 'Chümoukedima', 'Niuland', 'Meluri'
];

const MAIN_DISTRICTS = DISTRICTS.slice(0, 8);
const MORE_DISTRICTS = DISTRICTS.slice(8);

const DISTRICT_COLORS: Record<string, string> = {
  'Kohima': 'from-emerald-950 to-green-950',
  'Dimapur': 'from-red-950 to-rose-950',
  'Mokokchung': 'from-blue-950 to-sky-950',
  'Mon': 'from-purple-950 to-violet-950',
  'Tuensang': 'from-amber-950 to-yellow-950',
  'Wokha': 'from-teal-950 to-cyan-950',
  'Phek': 'from-pink-950 to-fuchsia-950',
  'Zunheboto': 'from-lime-950 to-green-950',
  'Peren': 'from-emerald-950 to-teal-950',
  'Longleng': 'from-orange-950 to-amber-950',
  'Kiphire': 'from-indigo-950 to-blue-950',
  'Noklak': 'from-red-950 to-orange-950',
  'Shamator': 'from-green-950 to-lime-950',
  'Tseminyü': 'from-violet-950 to-purple-950',
  'Chümoukedima': 'from-cyan-950 to-teal-950',
  'Niuland': 'from-yellow-950 to-orange-950',
  'Meluri': 'from-rose-950 to-pink-950',
};

const CAT_ICONS: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', hotel: '🏨', hospital: '🏥',
  pharmacy: '💊', salon: '✂️', school: '🏫', clinic: '🩺',
  turf: '⚽', pg: '🏠', coaching: '📚', rental: '🚗', shop: '🛍️', service: '🔧', other: '✦'
};

const QUICK_SEARCHES = ['Restaurants Kohima', 'Hotels Dimapur', 'Pharmacy near me', 'PG Kohima', 'Coaching centre'];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <main style={{ background: '#0d1a0d', color: '#e8ddd0', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        :root { --gold: #c9963a; --gold-light: #e8b85a; --cream: #f5ede0; --deep: #0d1a0d; --forest: #1a2e1a; }
        .playfair { font-family: 'Playfair Display', serif; }
        .label { font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 14px; }
        .gold-line { width: 60px; height: 1px; background: var(--gold); opacity: 0.5; margin-bottom: 24px; }
        .hero-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80') center/cover no-repeat; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(8,20,8,0.8) 0%, rgba(8,20,8,0.5) 40%, rgba(8,20,8,0.75) 75%, rgba(13,26,13,1) 100%); }
        .eyebrow { display: inline-flex; align-items: center; gap: 10px; border: 1px solid rgba(201,150,58,0.4); color: var(--gold); font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 8px 20px; margin-bottom: 28px; font-weight: 500; }
        .eyebrow::before, .eyebrow::after { content: '✦'; font-size: 0.55rem; }
        .search-wrap { display: flex; max-width: 700px; margin: 0 auto 24px; border: 1px solid rgba(201,150,58,0.4); background: rgba(8,20,8,0.7); backdrop-filter: blur(16px); }
        .search-input { flex: 1; background: transparent; border: none; outline: none; padding: 18px 24px; color: var(--cream); font-family: 'Outfit', sans-serif; font-size: 0.97rem; font-weight: 300; }
        .search-input::placeholder { color: rgba(232,221,208,0.3); }
        .search-btn { background: var(--gold); border: none; padding: 0 36px; color: var(--deep); font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .search-btn:hover { background: var(--gold-light); }
        .stag { border: 1px solid rgba(201,150,58,0.2); color: rgba(232,221,208,0.5); font-size: 0.78rem; padding: 5px 14px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em; background: transparent; }
        .stag:hover { border-color: var(--gold); color: var(--gold); }
        .why-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: rgba(201,150,58,0.08); }
        .why-card { background: var(--deep); padding: 52px 40px; position: relative; overflow: hidden; transition: background 0.3s; }
        .why-card:hover { background: rgba(201,150,58,0.04); }
        .why-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.4s; }
        .why-card:hover::before { transform: scaleX(1); }
        .why-num { font-family: 'Playfair Display', serif; font-size: 4rem; font-weight: 900; color: rgba(201,150,58,0.07); position: absolute; top: 16px; right: 24px; line-height: 1; }
        .district-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 3px; }
        .district-tile { padding: 36px 24px; cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s; border-bottom: 2px solid transparent; text-decoration: none; display: block; }
        .district-tile:hover { border-bottom-color: var(--gold); filter: brightness(1.25); }
        .district-dot { position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle, var(--gold) 1px, transparent 1px); background-size: 16px 16px; pointer-events: none; }
        .district-n { font-size: 0.6rem; letter-spacing: 0.2em; color: var(--gold); opacity: 0.6; margin-bottom: 8px; }
        .district-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; color: var(--cream); font-weight: 700; margin-bottom: 14px; }
        .district-arrow { color: rgba(201,150,58,0.3); font-size: 1rem; transition: all 0.3s; }
        .district-tile:hover .district-arrow { color: var(--gold); }
        .view-more-btn { background: transparent; border: 1px solid rgba(201,150,58,0.35); color: var(--gold); padding: 12px 32px; font-family: 'Outfit', sans-serif; font-size: 0.82rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s; margin-top: 28px; }
        .view-more-btn:hover { background: rgba(201,150,58,0.08); }
        .cat-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 1px; background: rgba(201,150,58,0.08); }
        .cat-tile { background: var(--forest); padding: 32px 16px; text-align: center; cursor: pointer; transition: background 0.3s; position: relative; text-decoration: none; display: block; }
        .cat-tile::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.3s; }
        .cat-tile:hover { background: rgba(201,150,58,0.06); }
        .cat-tile:hover::after { transform: scaleX(1); }
        .demo-phone { width: 300px; background: #0a160a; border: 1px solid rgba(201,150,58,0.2); border-radius: 28px; padding: 22px; box-shadow: 0 40px 80px rgba(0,0,0,0.5); }
        .phone-result { background: rgba(255,255,255,0.04); border: 1px solid rgba(201,150,58,0.1); padding: 11px 13px; border-radius: 4px; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
        .cursor-blink { display: inline-block; width: 2px; height: 13px; background: var(--gold); animation: blink 1s step-end infinite; vertical-align: middle; margin-left: 1px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cta-btn { display: inline-block; background: var(--gold); color: var(--deep); text-decoration: none; padding: 18px 52px; font-weight: 700; font-size: 0.82rem; letter-spacing: 0.14em; text-transform: uppercase; transition: all 0.25s; }
        .cta-btn:hover { background: var(--gold-light); transform: translateY(-2px); }
        .nav-link { color: rgba(232,221,208,0.7); text-decoration: none; font-size: 0.88rem; letter-spacing: 0.04em; transition: color 0.2s; }
        .nav-link:hover { color: var(--gold); }
        .nav-cta { background: transparent; border: 1px solid var(--gold); color: var(--gold); padding: 9px 22px; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; transition: all 0.25s; }
        .nav-cta:hover { background: var(--gold); color: var(--deep); }
        @media (max-width: 768px) {
          .why-grid { grid-template-columns: 1

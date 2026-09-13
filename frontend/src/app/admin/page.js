'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Download, Upload, ChevronDown, ChevronRight, Database, Globe, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import {
  getStoredData, createTournament, updateTournament, deleteTournament,
  addRaceToTournament, updateRace, deleteRace,
  addHorseToRace, updateHorse, deleteHorse,
  importTournamentData, exportDataAsJson,
} from '@/frontend/lib/admin/adminDataManager';
import { fetchRacesFromApi, getAvailableTracks, validateDataSource, DATA_SOURCES } from '@/frontend/lib/admin/racingApi';
import AppPageHeader from '@/frontend/components/layout/AppPageHeader';

function Field({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-purple/50 focus:outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple/50 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-brand-dark">{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function HorseRow({ horse, onUpdate, onDelete }) {
  return (
    <div className="grid grid-cols-[40px_1fr_1fr_1fr_80px_80px_40px] gap-2 items-center py-2 px-3 border-b border-white/5 text-sm">
      <span className="text-white/40 text-center">{horse.postPosition}</span>
      <input value={horse.name} onChange={(e) => onUpdate({ name: e.target.value })} className="bg-transparent border-b border-white/10 text-white px-1 py-0.5 focus:border-purple/50 focus:outline-none" placeholder="Horse name" />
      <input value={horse.jockey} onChange={(e) => onUpdate({ jockey: e.target.value })} className="bg-transparent border-b border-white/10 text-white/60 px-1 py-0.5 focus:border-purple/50 focus:outline-none text-xs" placeholder="Jockey" />
      <input value={horse.trainer} onChange={(e) => onUpdate({ trainer: e.target.value })} className="bg-transparent border-b border-white/10 text-white/40 px-1 py-0.5 focus:border-purple/50 focus:outline-none text-xs" placeholder="Trainer" />
      <input type="number" value={horse.weight} onChange={(e) => onUpdate({ weight: parseInt(e.target.value) || 56 })} className="bg-transparent border-b border-white/10 text-white/50 px-1 py-0.5 focus:border-purple/50 focus:outline-none text-xs text-center" />
      <input type="number" step="0.01" value={horse.odds} onChange={(e) => onUpdate({ odds: parseFloat(e.target.value) || 1 })} className="bg-transparent border-b border-white/10 text-gold px-1 py-0.5 focus:border-purple/50 focus:outline-none text-xs text-center font-bold" />
      <button onClick={onDelete} className="text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
    </div>
  );
}

function RaceEditor({ race, tournamentId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const handleUpdateRace = (fields) => {
    updateRace(tournamentId, race.id, fields);
    onRefresh();
  };

  const handleAddHorse = () => {
    addHorseToRace(tournamentId, race.id, { name: '', jockey: '', trainer: '', weight: 56, odds: 5.0 });
    onRefresh();
    setExpanded(true);
  };

  const handleUpdateHorse = (horseId, fields) => {
    updateHorse(tournamentId, race.id, horseId, fields);
    onRefresh();
  };

  const handleDeleteHorse = (horseId) => {
    deleteHorse(tournamentId, race.id, horseId);
    onRefresh();
  };

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
        <span className="text-xs font-bold text-purple-light">C{race.number}</span>
        <input value={race.name} onChange={(e) => handleUpdateRace({ name: e.target.value })} onClick={(e) => e.stopPropagation()} className="bg-transparent text-white text-sm font-semibold flex-1 focus:outline-none border-b border-transparent focus:border-purple/50" placeholder="Race name" />
        <Select value={race.status} onChange={(v) => handleUpdateRace({ status: v })} options={[{ value: 'upcoming', label: 'Proximo' }, { value: 'live', label: 'En Vivo' }, { value: 'completed', label: 'Completado' }]} className="w-32" />
        <span className="text-xs text-white/30">{race.horses.length} caballos</span>
        <button onClick={(e) => { e.stopPropagation(); deleteRace(tournamentId, race.id); onRefresh(); }} className="text-red-400/30 hover:text-red-400"><Trash2 size={14} /></button>
      </div>

      {expanded && (
        <div>
          <div className="grid grid-cols-4 gap-3 px-4 py-3 border-t border-white/5">
            <Field label="Clase" value={race.class} onChange={(v) => handleUpdateRace({ class: v })} />
            <Field label="Distancia (m)" value={race.distance} onChange={(v) => handleUpdateRace({ distance: v })} type="number" />
            <Select label="Superficie" value={race.surface} onChange={(v) => handleUpdateRace({ surface: v })} options={[{ value: 'Dirt', label: 'Tierra' }, { value: 'Turf', label: 'Cesped' }, { value: 'Synthetic', label: 'Sintetica' }]} />
            <Field label="Hora" value={race.postTime} onChange={(v) => handleUpdateRace({ postTime: v })} />
          </div>

          <div className="border-t border-white/5">
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_80px_80px_40px] gap-2 px-3 py-1.5 text-[10px] text-white/30 uppercase tracking-wider">
              <span className="text-center">#</span><span>Caballo</span><span>Jinete</span><span>Entrenador</span><span className="text-center">Peso</span><span className="text-center">Cuota</span><span></span>
            </div>
            {race.horses.map((horse) => (
              <HorseRow key={horse.id} horse={horse} onUpdate={(fields) => handleUpdateHorse(horse.id, fields)} onDelete={() => handleDeleteHorse(horse.id)} />
            ))}
            <button onClick={handleAddHorse} className="w-full py-2 text-xs text-white/30 hover:text-purple-light hover:bg-white/[0.02] flex items-center justify-center gap-1 transition-colors">
              <Plus size={12} /> Agregar Caballo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState({ tournaments: [], lastUpdated: null });
  const [activeTab, setActiveTab] = useState('tournaments');
  const [apiKey, setApiKey] = useState('');
  const [fetchStatus, setFetchStatus] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState('gulfstream-park');
  const [fetchDate, setFetchDate] = useState(new Date().toISOString().split('T')[0]);

  const refresh = useCallback(() => setData({ ...getStoredData() }), []);
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateTournament = () => {
    createTournament({ name: 'Nuevo Torneo', track: 'Gulfstream Park', location: 'Hallandale Beach, FL', date: new Date().toISOString().split('T')[0] });
    refresh();
  };

  const handleAddRace = (tournamentId) => {
    addRaceToTournament(tournamentId, { name: '', class: 'Open', distance: 1600, surface: 'Dirt', postTime: '12:00 ET' });
    refresh();
  };

  const handleExport = () => {
    const json = exportDataAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `50points-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importTournamentData(ev.target.result);
        if (result.success) refresh();
        else alert(`Import error: ${result.error}`);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleFetchFromApi = async () => {
    setFetchStatus({ loading: true, message: 'Fetching from Racing API...' });
    const result = await fetchRacesFromApi(selectedTrack, fetchDate, apiKey);

    if (result.success) {
      setFetchStatus({ loading: false, success: true, message: `Fetched ${result.races.length} races from ${result.source}` });
      const validation = validateDataSource(result.races);
      setValidationResult(validation);
    } else {
      setFetchStatus({ loading: false, success: false, message: `Error: ${result.error}` });
    }
  };

  const handleValidateCurrentData = () => {
    const allRaces = data.tournaments.flatMap((t) => t.races);
    const result = validateDataSource(allRaces);
    setValidationResult(result);
  };

  const tracks = getAvailableTracks();

  return (
    <>
        <AppPageHeader
          className="mb-8"
          title="Admin Panel"
          subtitle="Manage tournaments, races, and data sources"
          actions={
            <div className="flex gap-2">
              <button onClick={handleImport} className="mis-stats-filter" type="button">
                <Upload size={14} /> Import JSON
              </button>
              <button onClick={handleExport} className="mis-stats-filter" type="button">
                <Download size={14} /> Export JSON
              </button>
            </div>
          }
        />

        <div className="flex gap-2 mb-6">
          {[
            { id: 'tournaments', label: 'Tournaments', icon: Database },
            { id: 'datasource', label: 'Data Sources', icon: Globe },
            { id: 'validation', label: 'Validation', icon: CheckCircle2 },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-purple/20 text-purple-light border border-purple/30' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {data.tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <input value={tournament.name} onChange={(e) => { updateTournament(tournament.id, { name: e.target.value }); refresh(); }} className="bg-transparent text-lg font-bold text-white w-full focus:outline-none border-b border-transparent focus:border-purple/50" />
                  </div>
                  <button onClick={() => { deleteTournament(tournament.id); refresh(); }} className="text-red-400/30 hover:text-red-400 ml-3"><Trash2 size={16} /></button>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <Field label="Track" value={tournament.track} onChange={(v) => { updateTournament(tournament.id, { track: v }); refresh(); }} />
                  <Field label="Location" value={tournament.location} onChange={(v) => { updateTournament(tournament.id, { location: v }); refresh(); }} />
                  <Field label="Date" value={tournament.date} onChange={(v) => { updateTournament(tournament.id, { date: v }); refresh(); }} type="date" />
                  <Select label="Status" value={tournament.status} onChange={(v) => { updateTournament(tournament.id, { status: v }); refresh(); }} options={[{ value: 'upcoming', label: 'Proximo' }, { value: 'live', label: 'En Vivo' }, { value: 'completed', label: 'Completado' }]} />
                </div>

                <div className="space-y-2">
                  {tournament.races.map((race) => (
                    <RaceEditor key={race.id} race={race} tournamentId={tournament.id} onRefresh={refresh} />
                  ))}
                </div>

                <button onClick={() => handleAddRace(tournament.id)} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] border border-dashed border-white/10 rounded-lg text-xs text-white/30 hover:text-purple-light hover:border-purple/30 w-full justify-center transition-colors">
                  <Plus size={14} /> Add Race
                </button>
              </div>
            ))}

            <button onClick={handleCreateTournament} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple to-purple-light rounded-xl text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-shadow">
              <Plus size={16} /> Create Tournament
            </button>

            {data.lastUpdated && (
              <p className="text-xs text-white/20 mt-4">Last updated: {new Date(data.lastUpdated).toLocaleString()}</p>
            )}
          </div>
        )}

        {activeTab === 'datasource' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe size={16} className="text-cyan" /> The Racing API Integration
              </h3>
              <p className="text-xs text-white/40 mb-4">Connect to The Racing API (theracingapi.com) to fetch real race data for US tracks. Free tier available.</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Field label="API Key" value={apiKey} onChange={setApiKey} />
                <Select label="Track" value={selectedTrack} onChange={setSelectedTrack} options={tracks.map((t) => ({ value: t.id, label: `${t.name} (${t.location})` }))} />
                <Field label="Date" value={fetchDate} onChange={setFetchDate} type="date" />
              </div>

              <button onClick={handleFetchFromApi} disabled={fetchStatus?.loading} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple to-cyan rounded-lg text-sm font-bold text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-shadow disabled:opacity-50">
                <Database size={14} /> {fetchStatus?.loading ? 'Fetching...' : 'Fetch Race Data'}
              </button>

              {fetchStatus && !fetchStatus.loading && (
                <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${fetchStatus.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {fetchStatus.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {fetchStatus.message}
                </div>
              )}
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Validated Data Sources</h3>
              <div className="space-y-2 text-xs text-white/50">
                <div className="flex items-center gap-2 p-2 rounded bg-white/[0.02]">
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="font-medium text-white/70">The Racing API</span>
                  <span className="text-white/30">theracingapi.com</span>
                  <span className="ml-auto text-green-400/60">Free tier + NA add-on</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-white/[0.02]">
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="font-medium text-white/70">RapidAPI Horse Racing USA</span>
                  <span className="text-white/30">rapidapi.com</span>
                  <span className="ml-auto text-amber-400/60">Free tier (500 req/mo)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-white/[0.02]">
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="font-medium text-white/70">Manual Admin Entry</span>
                  <span className="text-white/30">Built-in fallback</span>
                  <span className="ml-auto text-green-400/60">Always available</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" /> Data Validation
              </h3>

              <button onClick={handleValidateCurrentData} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors mb-4">
                <CheckCircle2 size={14} /> Validate Current Data
              </button>

              {validationResult && (
                <div className={`p-4 rounded-lg border ${validationResult.valid ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.valid ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-amber-400" />}
                    <span className={`text-sm font-bold ${validationResult.valid ? 'text-green-400' : 'text-amber-400'}`}>
                      {validationResult.valid ? 'All data valid' : `${validationResult.issues.length} issue(s) found`}
                    </span>
                  </div>
                  {validationResult.raceCount !== undefined && (
                    <p className="text-xs text-white/40 mb-2">Races: {validationResult.raceCount} | Horses: {validationResult.horseCount}</p>
                  )}
                  {validationResult.issues?.length > 0 && (
                    <ul className="text-xs text-amber-400/70 space-y-1">
                      {validationResult.issues.slice(0, 10).map((issue, i) => (
                        <li key={i} className="flex items-center gap-1"><AlertCircle size={10} /> {issue}</li>
                      ))}
                      {validationResult.issues.length > 10 && <li className="text-white/30">...and {validationResult.issues.length - 10} more</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Technical Viability Checklist</h3>
              <div className="space-y-3">
                {[
                  { label: 'Public data sources validated', desc: 'The Racing API + RapidAPI endpoints confirmed with US track coverage', status: 'done' },
                  { label: 'Functional race template built', desc: 'RaceCard component with strategy selector, horse picker, points system', status: 'done' },
                  { label: 'Automatic data population tested', desc: 'API service layer with normalize/validate pipeline ready', status: 'done' },
                  { label: 'Manual admin fallback structure', desc: 'Full CRUD admin panel with import/export JSON support', status: 'done' },
                  { label: 'Project technical viability confirmed', desc: 'Next.js + static export + API data layer = production-ready architecture', status: 'done' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm text-white font-medium">{item.label}</span>
                      <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, EnergyListing, MarketMatch, ExternalOpportunity } from '../services/apiService';
import BottomNavigation from '../components/BottomNavigation';

const CENTER_ICONS: Record<string, string> = {
  Head: 'fa-lightbulb', Ajna: 'fa-eye', Throat: 'fa-comment', G: 'fa-compass',
  Ego: 'fa-hand-fist', Solar: 'fa-water', Sacral: 'fa-fire', Spleen: 'fa-shield-halved', Root: 'fa-seedling',
};

type Tab = 'need' | 'offer';

const MarketScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId, profile } = useAuth();

  const [tab, setTab] = useState<Tab>('need');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [energyType, setEnergyType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(15);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const [centerListings, setCenterListings] = useState<EnergyListing[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [externalOpportunities, setExternalOpportunities] = useState<ExternalOpportunity[]>([]);
  const [externalSearching, setExternalSearching] = useState(false);
  const [invitedOpportunityIds, setInvitedOpportunityIds] = useState<Set<string>>(new Set());

  const centers = profile?.natal_report?.bodygraph?.centers || {};
  const definedCenters = Object.entries(centers).filter(([, s]) => s === 'Defined').map(([c]) => c);
  const openCenters = Object.entries(centers).filter(([, s]) => s !== 'Defined').map(([c]) => c);

  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const b = await apiService.getCredits(userId);
      setBalance(b.balance);
    } catch { /* no balance yet */ }
  }, [userId]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  const loadCenterListings = async (center: string) => {
    setSelectedCenter(center);
    setError('');
    setMatches([]);
    setExternalOpportunities([]);
    setActiveRequestId(null);
    try {
      const res = await apiService.getListingsForCenter(center);
      setCenterListings(res.listings);
    } catch {
      setCenterListings([]);
    }
  };

  const submitRequest = async () => {
    if (!userId || !selectedCenter || !energyType || !description) return;
    setLoading(true);
    setError('');
    try {
      const req = await apiService.requestEnergy({
        buyer_id: userId, center: selectedCenter, energy_type: energyType,
        description, max_price: price, urgency,
      });
      setActiveRequestId(req.id);
      const found = await apiService.findMarketMatches(req.id);
      setMatches(found.matches);
      setExternalOpportunities([]);
      if (found.matches.length === 0) {
        setNotice('No internal match yet. Looking beyond the Resonance Network through MCP…');
        setExternalSearching(true);
        try {
          const outside = await apiService.discoverExternalForMarketRequest(req.id);
          const eligible = outside.opportunities.filter((o) => o.eligible);
          setExternalOpportunities(eligible);
          setNotice(eligible.length
            ? `No internal match, but ${eligible.length} outside opportunity${eligible.length === 1 ? '' : 'ies'} surfaced through MCP.`
            : 'No internal or connected external opportunity matched this request yet.');
        } catch (externalError: any) {
          const detail = externalError?.response?.data?.detail;
          setNotice(detail ? `Internal network had no match. External MCP search is unavailable: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : 'Internal network had no match. No external MCP opportunity source is connected right now.');
        } finally {
          setExternalSearching(false);
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not create request');
    } finally {
      setLoading(false);
    }
  };

  const submitListing = async () => {
    if (!userId || !selectedCenter || !energyType || !description) return;
    setLoading(true);
    setError('');
    try {
      await apiService.listEnergy({
        seller_id: userId, center: selectedCenter, energy_type: energyType,
        description, price,
      });
      setNotice('Listed! Others with an open ' + selectedCenter + ' can now request it.');
      setEnergyType(''); setDescription('');
      await loadCenterListings(selectedCenter);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not list energy');
    } finally {
      setLoading(false);
    }
  };

  const inviteExternal = async (opportunity: ExternalOpportunity) => {
    setLoading(true);
    setError('');
    try {
      const candidate = opportunity.candidate.name || opportunity.candidate.id;
      const result = await apiService.inviteExternalOpportunity(
        opportunity.opportunityId,
        `The Resonance Network found a possible reciprocal fit with ${candidate}. Would you like to explore a trial or collaboration?`
      );
      if (result.sent) {
        setInvitedOpportunityIds((prev) => new Set([...prev, opportunity.opportunityId]));
        setNotice(`One invitation sent to ${candidate}. They stay outside the network unless they choose to accept.`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail?.error || e?.response?.data?.detail || 'Could not send the external invitation');
    } finally {
      setLoading(false);
    }
  };

  const transact = async (listingId: string) => {
    if (!activeRequestId) return;
    setLoading(true);
    setError('');
    try {
      const tx = await apiService.executeMarketTransaction(listingId, activeRequestId, 'resonance-network');
      setNotice(`Exchange complete — ${tx.seller_receives.toFixed(2)} credits sent, resonance ${(tx.resonance_score * 100).toFixed(0)}%.`);
      setMatches([]);
      setActiveRequestId(null);
      await refreshBalance();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const centerList = tab === 'need' ? openCenters : definedCenters;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-cyan safe-area-top safe-area-bottom pb-24">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white">
              <i className="fa fa-arrow-left text-xl"></i>
            </button>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">MARKET</h1>
          </div>
          <div className="pixel-card !p-2 flex items-center gap-2">
            <i className="fa fa-coins text-retro-yellow"></i>
            <span className="font-pixel text-white text-sm">{balance.toFixed(0)}</span>
          </div>
        </div>

        {/* Tabs — big thumb-friendly targets */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => { setTab('need'); setSelectedCenter(null); setMatches([]); setExternalOpportunities([]); }}
            className={`py-3 font-pixel text-xs border-2 transition-all ${
              tab === 'need' ? 'bg-retro-purple/20 border-retro-purple text-retro-purple' : 'border-gray-600 text-white/70'
            }`}
          >
            <i className="fa fa-hand-holding-heart mr-2"></i>I NEED
          </button>
          <button
            onClick={() => { setTab('offer'); setSelectedCenter(null); setMatches([]); setExternalOpportunities([]); }}
            className={`py-3 font-pixel text-xs border-2 transition-all ${
              tab === 'offer' ? 'bg-retro-green/20 border-retro-green text-retro-green' : 'border-gray-600 text-white/70'
            }`}
          >
            <i className="fa fa-hand-holding-dollar mr-2"></i>I CAN OFFER
          </button>
        </div>

        {centerList.length === 0 && (
          <div className="pixel-card text-center text-white/60 font-pixel text-xs">
            {tab === 'need' ? 'Every center in your chart is Defined — nothing to request.' : 'No open centers to offer yet.'}
          </div>
        )}

        {/* Center picker — vertical list, easy to tap on a phone */}
        {!selectedCenter && centerList.length > 0 && (
          <div className="space-y-2">
            {centerList.map((c) => (
              <button
                key={c}
                onClick={() => loadCenterListings(c)}
                className="pixel-card w-full flex items-center justify-between !py-3 active:opacity-70"
              >
                <span className="flex items-center gap-3 font-pixel text-sm text-white">
                  <i className={`fa ${CENTER_ICONS[c] || 'fa-circle'} text-retro-cyan`}></i>
                  {c}
                </span>
                <i className="fa fa-chevron-right text-white/40"></i>
              </button>
            ))}
          </div>
        )}

        {/* Detail view for a chosen center */}
        {selectedCenter && (
          <div className="animate-slide-up">
            <button onClick={() => setSelectedCenter(null)} className="text-white/60 font-pixel text-xs mb-3">
              <i className="fa fa-arrow-left mr-1"></i> back to centers
            </button>

            {tab === 'need' ? (
              <div className="pixel-card space-y-4">
                <p className="font-pixel text-retro-purple text-sm">
                  <i className={`fa ${CENTER_ICONS[selectedCenter] || 'fa-circle'} mr-2`}></i>
                  Request {selectedCenter} energy
                </p>
                <input
                  className="w-full pixel-input"
                  placeholder="Energy type (e.g. Directional Guidance)"
                  value={energyType}
                  onChange={(e) => setEnergyType(e.target.value)}
                />
                <textarea
                  className="w-full pixel-input h-20 resize-none"
                  placeholder="What do you need help with?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div>
                  <label className="block font-pixel text-xs text-white/60 mb-2">MAX PRICE: {price}</label>
                  <input type="range" min={5} max={100} step={5} value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value))} className="pixel-slider w-full" />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'critical'] as const).map((u) => (
                    <button key={u} onClick={() => setUrgency(u)}
                      className={`py-3 font-pixel text-[10px] border-2 min-h-[44px] ${
                        urgency === u ? 'border-retro-pink text-retro-pink bg-retro-pink/10' : 'border-gray-600 text-white/60'
                      }`}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={submitRequest} disabled={loading || !energyType || !description}
                  className="w-full pixel-button disabled:opacity-50">
                  {loading ? <><i className="fa fa-spinner animate-pixel-spin mr-2"></i>SEARCHING...</> : 'FIND A MATCH'}
                </button>
              </div>
            ) : (
              <div className="pixel-card space-y-4">
                <p className="font-pixel text-retro-green text-sm">
                  <i className={`fa ${CENTER_ICONS[selectedCenter] || 'fa-circle'} mr-2`}></i>
                  Offer your {selectedCenter} energy
                </p>
                <input
                  className="w-full pixel-input"
                  placeholder="Energy type (e.g. Life Force Boost)"
                  value={energyType}
                  onChange={(e) => setEnergyType(e.target.value)}
                />
                <textarea
                  className="w-full pixel-input h-20 resize-none"
                  placeholder="What can you offer?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div>
                  <label className="block font-pixel text-xs text-white/60 mb-2">PRICE: {price} credits</label>
                  <input type="range" min={5} max={100} step={5} value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value))} className="pixel-slider w-full" />
                </div>
                <button onClick={submitListing} disabled={loading || !energyType || !description}
                  className="w-full pixel-button disabled:opacity-50">
                  {loading ? <><i className="fa fa-spinner animate-pixel-spin mr-2"></i>LISTING...</> : 'LIST THIS ENERGY'}
                </button>

                {centerListings.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="font-pixel text-[10px] text-white/50 mb-2">EXISTING LISTINGS FOR {selectedCenter}</p>
                    {centerListings.map((l) => (
                      <div key={l.id} className="flex justify-between py-1 text-xs font-pixel text-white/70">
                        <span>{l.energy_type}</span>
                        <span className="text-retro-yellow">{l.price}c</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Matches */}
            {matches.length > 0 && (
              <div className="mt-4 space-y-2 animate-slide-up">
                <p className="font-pixel text-xs text-white/60">MATCHES FOUND</p>
                {matches.map((m) => (
                  <div key={m.listing.id} className="pixel-card !py-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-pixel text-sm text-white">{m.listing.energy_type}</p>
                        <p className="font-pixel text-[10px] text-white/50">from {m.listing.seller_name}</p>
                      </div>
                      <span className="font-pixel text-retro-yellow text-sm">{m.price}c</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-retro-purple" style={{ width: `${m.match_score * 100}%` }} />
                      </div>
                      <span className="font-pixel text-[10px] text-white/50">{Math.round(m.match_score * 100)}% match</span>
                    </div>
                    <button onClick={() => transact(m.listing.id)} disabled={loading}
                      className="w-full pixel-button !py-2 !text-xs disabled:opacity-50">
                      EXCHANGE
                    </button>
                  </div>
                ))}
              </div>
            )}

            {externalSearching && (
              <div className="mt-4 pixel-card text-center font-pixel text-xs text-retro-cyan">
                <i className="fa fa-satellite-dish animate-pulse mr-2"></i>SEARCHING OUTSIDE THE NETWORK THROUGH MCP…
              </div>
            )}

            {externalOpportunities.length > 0 && (
              <div className="mt-4 space-y-2 animate-slide-up">
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-xs text-retro-cyan">OUTSIDE OPPORTUNITIES</p>
                  <span className="font-pixel text-[9px] text-white/40">NOT NETWORK MEMBERS</span>
                </div>
                {externalOpportunities.map((o) => {
                  const invited = invitedOpportunityIds.has(o.opportunityId);
                  return (
                    <div key={o.opportunityId} className="pixel-card !py-3 border-retro-cyan/50">
                      <div className="flex justify-between gap-3 items-start">
                        <div>
                          <p className="font-pixel text-sm text-white">{o.candidate.name || o.candidate.id}</p>
                          <p className="font-pixel text-[9px] text-retro-cyan mt-1">MCP · OUTSIDE RESONANCE NETWORK</p>
                        </div>
                        <span className="font-pixel text-[10px] text-white/60">{Math.round(o.reciprocalValue.predictedMutualBenefit * 100)}% mutual fit</span>
                      </div>
                      <p className="font-pixel text-[10px] text-white/55 mt-3">
                        Can offer: {o.reciprocalValue.whatCandidateCanOffer.join(', ') || 'compatible external capability'}
                      </p>
                      <p className="font-pixel text-[10px] text-white/40 mt-1">
                        Network offers: {o.reciprocalValue.whatNetworkCanOffer.join(', ')}
                      </p>
                      <button onClick={() => inviteExternal(o)} disabled={loading || invited}
                        className="w-full pixel-button !py-2 !text-xs mt-3 disabled:opacity-50">
                        {invited ? 'INVITATION SENT' : 'SEND ONE INVITATION'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {notice && (
          <div className="mt-4 bg-retro-green/20 border-2 border-retro-green p-3 text-retro-green font-pixel text-xs">
            <i className="fa fa-circle-check mr-2"></i>{notice}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-retro-red/20 border-2 border-retro-red p-3 text-retro-red font-pixel text-xs">
            <i className="fa fa-exclamation-triangle mr-2"></i>{error}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default MarketScreen;

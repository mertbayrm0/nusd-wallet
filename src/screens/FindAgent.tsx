import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet default icon path issues in Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Green Icon for Agents
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to fly to selected agent
const FlyToAgent = ({ agent }: { agent: any }) => {
    const map = useMap();
    useEffect(() => {
        if (agent && agent.latitude && agent.longitude) {
            map.flyTo([agent.latitude, agent.longitude], 15, { duration: 1.5 });
        }
    }, [agent, map]);
    return null;
};

const FindAgent = () => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<any>(null);

    useEffect(() => {
        api.getPublicAgents().then(setAgents);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-[#111]">
            {/* Header */}
            <div className="p-4 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between z-20 shadow-xl">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#333] flex items-center justify-center text-gray-400 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-lime-400">location_on</span>
                            Agent Locator
                        </h2>
                        <p className="text-gray-500 text-xs mt-0.5">Verified Exchange Points</p>
                    </div>
                </div>
                {/* Stats */}
                <div className="bg-[#222] px-4 py-2 rounded-lg border border-white/5 hidden md:block">
                    <span className="text-gray-400 text-xs">Nearby Agents:</span>
                    <span className="ml-2 text-lime-400 font-bold">{agents.length}</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar List (Desktop: Left, Mobile: Bottom Sheet implied/scroll) */}
                <div className="w-full md:w-96 bg-[#1a1a1a] border-r border-white/5 flex flex-col z-10 shadow-2xl absolute md:relative h-1/3 md:h-full bottom-0 md:bottom-auto">
                    <div className="p-4 border-b border-white/5 bg-[#1a1a1a] sticky top-0">
                        <input
                            type="text"
                            placeholder="Inter city or region..."
                            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500/50 transition-all text-sm"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
                        {agents.length === 0 ? (
                            <div className="text-center py-10 text-gray-600">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">map</span>
                                <p>No agents found yet.</p>
                            </div>
                        ) : (
                            agents.map((agent: any) => (
                                <div key={agent.id}
                                    onClick={() => setSelectedAgent(agent)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all group ${selectedAgent?.id === agent.id ? 'bg-lime-500/10 border-lime-500/50' : 'bg-[#222] border-transparent hover:border-white/10'}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white group-hover:text-lime-400 transition-colors">{agent.name}</h3>
                                        <span className="bg-lime-500/20 text-lime-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Verified</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
                                        <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">store</span>
                                        {agent.address || "No address provided"}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                            {agent.hours || "09:00 - 18:00"}
                                        </p>
                                        <button className="text-lime-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">directions</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative bg-[#0c0c0c]">
                    <MapContainer center={[41.0082, 28.9784]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        <FlyToAgent agent={selectedAgent} />

                        {agents.map((agent: any) => (
                            agent.latitude && agent.longitude && (
                                <Marker
                                    key={agent.id}
                                    position={[agent.latitude, agent.longitude]}
                                    icon={greenIcon}
                                    eventHandlers={{
                                        click: () => setSelectedAgent(agent)
                                    }}
                                >
                                    <Popup className="agent-popup">
                                        <div className="p-1 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                {agent.logo && <img src={agent.logo} className="w-8 h-8 rounded-full object-cover" />}
                                                <div>
                                                    <h3 className="font-bold text-black text-sm leading-tight">{agent.name}</h3>
                                                    <span className="text-[10px] text-green-600 font-bold">Authorized Agent</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-xs mb-3 leading-snug">{agent.address}</p>
                                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${agent.latitude},${agent.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block w-full bg-black text-white text-center py-2 rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors shadow-lg">
                                                Get Directions on Google Maps
                                            </a>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>

                    {/* Map Overlay Controls */}
                    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                        <button className="w-10 h-10 bg-[#1a1a1a] text-white rounded-lg shadow-xl flex items-center justify-center hover:bg-[#222]" onClick={() => window.location.reload()}>
                            <span className="material-symbols-outlined">my_location</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Toggle Logic could be added here to switch view */}
        </div>
    );
};

export default FindAgent;

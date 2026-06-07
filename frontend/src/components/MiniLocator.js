import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Tokens } from '../design/tokens';
import { useAuth } from '../hooks/useAuth';
const DEFAULT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ZOOM = 8;
/**
 * Mini-carte Leaflet pliée dans le cadre vintage de la lightbox. Utilise le
 * même tile-server que la grande carte (paramétré dans le profil utilisateur)
 * et reste interactive (zoom + pan).
 */
export function MiniLocator({ country, region, lat, lng }) {
    const { user } = useAuth();
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markerRef = useRef(null);
    // Init une seule fois
    useEffect(() => {
        if (!containerRef.current || mapRef.current)
            return;
        const map = L.map(containerRef.current, {
            attributionControl: false,
            zoomControl: false,
            worldCopyJump: true,
            preferCanvas: true,
        });
        L.control.zoom({ position: 'bottomleft' }).addTo(map);
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
    }, []);
    // Tile layer (recrée si le tile-server change)
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }
        tileLayerRef.current = L.tileLayer(user?.mapTilesServer || DEFAULT_TILES).addTo(map);
    }, [user?.mapTilesServer]);
    // Centre + marker (recalcule si la photo change)
    useEffect(() => {
        const map = mapRef.current;
        if (!map)
            return;
        if (lat != null && lng != null) {
            map.setView([lat, lng], DEFAULT_ZOOM);
            if (markerRef.current)
                markerRef.current.remove();
            markerRef.current = L.circleMarker([lat, lng], {
                radius: 6, color: '#2a1d10', weight: 1.5,
                fillColor: '#8b1a1a', fillOpacity: 0.95,
            }).addTo(map);
        }
        else {
            map.setView([0, 0], 1);
        }
        // Leaflet a besoin d'un invalidateSize après affichage dans un container
        // qui pourrait avoir pris sa taille tardivement (lightbox).
        setTimeout(() => map.invalidateSize(), 50);
    }, [lat, lng]);
    return (_jsx("div", { style: {
            width: 200, padding: 5,
            background: Tokens.paperLight,
            border: `1px solid ${Tokens.inkSoft}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            fontFamily: '"Cormorant Garamond", serif',
        }, children: _jsxs("div", { style: {
                border: `1px solid ${Tokens.inkMuted}`, padding: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'stretch',
            }, children: [_jsx("div", { ref: containerRef, style: {
                        width: '100%', height: 180,
                        background: Tokens.paperDark,
                    } }), _jsxs("div", { style: {
                        paddingTop: 6,
                        fontSize: 12, color: Tokens.inkSoft,
                        textAlign: 'center', lineHeight: 1.2,
                    }, children: [_jsx("div", { style: { fontWeight: 600 }, children: country }), region && (_jsx("div", { style: {
                                fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase',
                                color: Tokens.inkMuted, marginTop: 1,
                            }, children: region }))] })] }) }));
}

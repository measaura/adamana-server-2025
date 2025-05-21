import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {APIProvider, Map, AdvancedMarker, MapCameraChangedEvent, useMap, Pin} from '@vis.gl/react-google-maps';

type Poi ={ key: string, location: google.maps.LatLngLiteral; name: string };
const locations: Poi[] = [
    { key: 'operaHouse', location: { lat: -33.8567844, lng: 151.213108 }, name: 'Opera House' },
    { key: 'tarongaZoo', location: { lat: -33.8472767, lng: 151.2188164 }, name: 'Taronga Zoo' },
    { key: 'manlyBeach', location: { lat: -33.8209738, lng: 151.2563253 }, name: 'Manly Beach' },
    { key: 'hyderPark', location: { lat: -33.8690081, lng: 151.2052393 }, name: 'Hyde Park' },
    { key: 'theRocks', location: { lat: -33.8587568, lng: 151.2058246 }, name: 'The Rocks' },
    { key: 'circularQuay', location: { lat: -33.858761, lng: 151.2055688 }, name: 'Circular Quay' },
    { key: 'harbourBridge', location: { lat: -33.852228, lng: 151.2038374 }, name: 'Harbour Bridge' },
    { key: 'kingsCross', location: { lat: -33.8737375, lng: 151.222569 }, name: 'Kings Cross' },
    { key: 'botanicGardens', location: { lat: -33.864167, lng: 151.216387 }, name: 'Botanic Gardens' },
    { key: 'museumOfSydney', location: { lat: -33.8636005, lng: 151.2092542 }, name: 'Museum of Sydney' },
    { key: 'maritimeMuseum', location: { lat: -33.869395, lng: 151.198648 }, name: 'Maritime Museum' },
    { key: 'kingStreetWharf', location: { lat: -33.8665445, lng: 151.1989808 }, name: 'King Street Wharf' },
    { key: 'aquarium', location: { lat: -33.869627, lng: 151.202146 }, name: 'Aquarium' },
    { key: 'darlingHarbour', location: { lat: -33.87488, lng: 151.1987113 }, name: 'Darling Harbour' },
    { key: 'barangaroo', location: { lat: -33.8605523, lng: 151.1972205 }, name: 'Barangaroo' },
];
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Main Map',
        href: '/main-map',
    },
];
const PoiMarkers = (props: {pois: Poi[]}) => {
    const map = useMap();
    const handleClick = useCallback((ev: google.maps.MapMouseEvent) => {
        if(!map) return;
        if(!ev.latLng) return;
        console.log('marker clicked:', ev.latLng.toString());
        map.panTo(ev.latLng);
    }, [map]);
  return (
    <>
      {props.pois.map( (poi: Poi) => (
        <AdvancedMarker
          key={poi.key}
          position={poi.location}
          clickable={true}
          onClick={handleClick}>
        <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
        </AdvancedMarker>
      ))}
    </>
  );
};

export default function MainMap() {
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -33.860664, lng: 151.208138 }); // Default center

    const handleLinkClick = (newCenter: { lat: number; lng: number }) => {
        setMapCenter(newCenter);
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Main Map" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <APIProvider apiKey={apiKey} > 
                    <div className="relative h-full w-full">
                        <Map
                            defaultZoom={13}
                            center={mapCenter}
                            mapId={'8f6f22c9f9dad363'}
                            onCameraChanged={ (ev: MapCameraChangedEvent) =>
                                console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
                            }>
                            <PoiMarkers pois={locations} />
                        </Map>
                        {/* Overlay Panel */}
                        <div className="absolute top-25 left-4 z-10 w-50 max-h-[70vh] overflow-y-auto rounded-lg outline-5 outline-[#C40D42] bg-white opacity-80 p-4 shadow-lg dark:bg-neutral-800 dark:opacity-80">
                            <h3 className="text-lg font-semibold mb-2">Points of Interest</h3>
                            <ul className="space-y-2">
                                {locations.map((poi) => (
                                    <li
                                        key={poi.key}
                                        className="cursor-pointer text-sm text-black-700 dark:text-gray-300 hover:underline"
                                        // onClick={() => console.log(`Clicked on ${poi.name}`)}
                                        onClick={() => {handleLinkClick(poi.location); console.log(`Clicked on ${poi.name}, ${poi.location.lat}`);}} // Update map center on click
                                    >
                                        {poi.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </APIProvider>
            </div>
        </AppLayout>
    );
}

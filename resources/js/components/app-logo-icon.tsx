import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            xmlSpace="preserve"
            style={{
            fillRule: "evenodd",
            clipRule: "evenodd",
            strokeLinejoin: "round",
            strokeMiterlimit: 2,
            }}
            {...props}
        >
            <rect
            id="Artboard1"
            x={0}
            y={0}
            width={1024}
            height={1024}
            style={{
                fill: "none",
            }}
            />
            <g id="Artboard11">
            <path
                d="M1024,119.785C1024,53.674 970.326,0 904.215,0L119.785,0C53.674,0 0,53.674 0,119.785L0,904.215C0,970.326 53.674,1024 119.785,1024L904.215,1024C970.326,1024 1024,970.326 1024,904.215L1024,119.785Z"
                style={{
                fill: "rgb(196,13,66)",
                }}
            />
            <g transform="matrix(1.06223,0,0,1.06223,-437.947,106.415)">
                <circle
                cx={893.825}
                cy={381.825}
                r={381.825}
                style={{
                    fill: "white",
                }}
                />
            </g>
            <g transform="matrix(2.54181,0,0,2.54181,798.92,106.415)">
                <path
                d="M0,271.43L-112.71,0L-225.76,271.43L-178.71,271.16L-112.38,111.991L-46.71,271.16L0,271.43Z"
                style={{
                    fill: "rgb(196,13,66)",
                }}
                />
            </g>
            <g transform="matrix(2.77771,0,0,2.77771,512,717.664)">
                <path
                d="M0,-66.34L5.06,-45.39L23.46,-56.63L12.22,-38.231L33.17,-33.17L12.22,-28.11L23.46,-9.71L5.06,-20.95L0,0L-5.06,-20.95L-23.46,-9.71L-12.22,-28.11L-33.17,-33.17L-12.22,-38.231L-23.46,-56.63L-5.06,-45.39L0,-66.34Z"
                style={{
                    fill: "rgb(198,2,63)",
                }}
                />
            </g>
            </g>
        </svg>
    );
}

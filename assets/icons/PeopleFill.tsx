import React from 'react';
import Svg, { Path, Ellipse, Rect } from 'react-native-svg';

interface PeopleFillProps {
    size?: number;
    color?: string;
}

export default function PeopleFill({ size = 19, color = '#1E293B' }: PeopleFillProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            {/* Icon người phía sau từ Octicons people */}
            <Path
                d="M20,55a35,35 0 1,1 59,25.5a55.1,55.1 0 0,1 30.3,40.8a7.5,7.5 0 1,1 -14.8,2.4a40,40 0 0,0 -79,0a7.5,7.5 0 0,1 -14.8,-2.4a55.1,55.1 0 0,1 30.3,-40.8a34.9,34.9 0 0,1 -11,-25.5zm90,-15a30,30 0 0,1 22.2,50.2a50.1,50.1 0 0,1 25.6,30.1a7.5,7.5 0 0,1 -8.8,9.5a7.5,7.5 0 0,1 -5.5,-5.1a35.1,35.1 0 0,0 -25.3,-23.7a7.5,7.5 0 0,1 -5.7,-7.3l0,-3.5a7.5,7.5 0 0,1 4.2,-6.8a15,15 0 0,0 -6.7,-28.4a7.5,7.5 0 0,1 0,-15zm-55,-5a20,20 0 1,0 0,40a20,20 0 0,0 0,-40z"
                fill={color}
            />

            {/* Đầu người phía trước (Nét tô đặc Fill) */}
            <Ellipse
                cx="55.4"
                cy="54"
                rx="21"
                ry="21"
                fill={color}
            />

            {/* Vai người phía trước (Nét tô đặc Fill) */}
            <Rect
                x="29.58"
                y="88.5"
                width="49.74"
                height="14"
                rx="4"
                fill={color}
            />
            <Rect
                x="20.4"
                y="98.5"
                width="71.2"
                height="14"
                rx="4"
                fill={color}
            />
            <Rect
                x="9.4"
                y="114"
                width="90.8"
                height="13.07"
                rx="4"
                fill={color}
            />
        </Svg>
    );
}
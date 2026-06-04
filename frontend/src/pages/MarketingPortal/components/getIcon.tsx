import React from 'react';
import {
  RocketIcon,
  BrainIcon,
  CloudIcon,
  CodeIcon,
  ChartIcon,
  HandshakeIcon,
} from './SectionIcons';

export const getIcon = (iconName: string, size = 60): React.ReactNode => {
  switch (iconName) {
    case 'rocket': return <RocketIcon size={size} />;
    case 'brain': return <BrainIcon size={size} />;
    case 'cloud': return <CloudIcon size={size} />;
    case 'code': return <CodeIcon size={size} />;
    case 'chart': return <ChartIcon size={size} />;
    case 'handshake': return <HandshakeIcon size={size} />;
    default: return <RocketIcon size={size} />;
  }
};

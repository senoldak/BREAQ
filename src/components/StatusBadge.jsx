import React from 'react';
import { Compass, Flame, AlertTriangle, Minus } from 'lucide-react';
import { BREAKOUT_STATUS } from '../services/breakoutEngine.js';

export function StatusBadge({ status, distancePercent }) {
  if (status === BREAKOUT_STATUS.FRESH_BREAKOUT) {
    return (
      <span className="badge badge-breakout">
        <Flame size={13} />
        <span>Fresh Breakout</span>
        {distancePercent !== undefined && (
          <span className="font-mono">+{distancePercent}%</span>
        )}
      </span>
    );
  }

  if (status === BREAKOUT_STATUS.COILING) {
    return (
      <span className="badge badge-coiling">
        <Compass size={13} />
        <span>Coiling</span>
        {distancePercent !== undefined && (
          <span className="font-mono">{distancePercent}%</span>
        )}
      </span>
    );
  }

  if (status === BREAKOUT_STATUS.EXTENDED) {
    return (
      <span className="badge badge-extended">
        <AlertTriangle size={13} />
        <span>Extended</span>
        {distancePercent !== undefined && (
          <span className="font-mono">+{distancePercent}%</span>
        )}
      </span>
    );
  }

  return (
    <span className="badge badge-neutral">
      <Minus size={12} />
      <span>Neutral</span>
    </span>
  );
}

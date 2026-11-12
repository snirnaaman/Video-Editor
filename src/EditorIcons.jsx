import React from 'react';
import { MousePointer2, Scissors, GripHorizontal, Columns, Grid3x3, SplitSquareHorizontal, LineChart } from 'lucide-react';

export const TOOLS = [
  { id: 'select', name: 'בחירה (V)', icon: <MousePointer2 size={14} /> },
  { id: 'blade', name: 'חיתוך (B)', icon: <Scissors size={14} /> },
  { id: 'roll', name: 'גלגול חיבור (N)', icon: <GripHorizontal size={14} /> }
];

export const VIEW_TOOLS = [
  { id: 'safeZone', name: 'מסגרת בטחון', icon: <Grid3x3 size={14} /> },
  { id: 'splitWipe', name: 'השוואת צבע', icon: <SplitSquareHorizontal size={14} /> },
  { id: 'scopes', name: 'מדדי צבע', icon: <LineChart size={14} /> }
];

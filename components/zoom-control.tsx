'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useZoom } from '@/components/zoom-context';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ZoomControl() {
  const { zoomLevel, setZoomLevel, increaseZoom, decreaseZoom, resetZoom } = useZoom();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <ZoomIn className="h-4 w-4" />
          <span className="text-xs">{zoomLevel}%</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Zoom</h4>
            <span className="text-sm text-muted-foreground">{zoomLevel}%</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={decreaseZoom}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Slider
              value={[zoomLevel]}
              onValueChange={(value) => setZoomLevel(value[0])}
              min={50}
              max={200}
              step={5}
              className="flex-1"
            />
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={increaseZoom}
              disabled={zoomLevel >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetZoom}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            
            <div className="text-xs text-muted-foreground">
              Use Ctrl + +/- to zoom
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
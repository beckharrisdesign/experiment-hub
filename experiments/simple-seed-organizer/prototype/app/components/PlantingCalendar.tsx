'use client';

import { Seed } from '@/types/seed';
import { ClimateData } from '@/types/climate';
import { PlantingGuidance } from '@/lib/plantingGuidance';
import { UserProfile } from '@/types/profile';

interface PlantingCalendarProps {
  seed: Seed;
  climate: ClimateData;
  guidance: PlantingGuidance;
  profile: UserProfile;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function PlantingCalendar({ seed, climate, guidance, profile }: PlantingCalendarProps) {
  const temperatures = [
    climate.averageTemperatures.january,
    climate.averageTemperatures.february,
    climate.averageTemperatures.march,
    climate.averageTemperatures.april,
    climate.averageTemperatures.may,
    climate.averageTemperatures.june,
    climate.averageTemperatures.july,
    climate.averageTemperatures.august,
    climate.averageTemperatures.september,
    climate.averageTemperatures.october,
    climate.averageTemperatures.november,
    climate.averageTemperatures.december,
  ];

  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const tempRange = maxTemp - minTemp;
  const chartHeight = 200;
  const chartWidth = 100; // per month
  const totalWidth = MONTHS.length * chartWidth;
  const barWidth = 60;
  const barSpacing = (chartWidth - barWidth) / 2;

  // Get month index for dates
  const getMonthIndex = (date: Date) => date.getMonth();
  const getDayInMonth = (date: Date) => date.getDate();
  const getXPosition = (date: Date) => {
    const monthIndex = getMonthIndex(date);
    const dayInMonth = getDayInMonth(date);
    const daysInMonth = new Date(date.getFullYear(), monthIndex + 1, 0).getDate();
    const monthProgress = dayInMonth / daysInMonth;
    return (monthIndex * chartWidth) + (monthProgress * chartWidth);
  };

  // Annotations to show
  const annotations: Array<{
    date: Date;
    label: string;
    color: string;
  }> = [];

  if (guidance.startSeedsIndoors) {
    annotations.push({
      date: guidance.startSeedsIndoors,
      label: 'Start Indoors',
      color: '#3b82f6',
    });
  }

  if (guidance.directSowDate) {
    annotations.push({
      date: guidance.directSowDate,
      label: 'Direct Sow',
      color: '#10b981',
    });
  }

  if (guidance.transplantDate) {
    annotations.push({
      date: guidance.transplantDate,
      label: 'Transplant',
      color: '#16a34a',
    });
  }

  if (guidance.expectedHarvestDate) {
    annotations.push({
      date: guidance.expectedHarvestDate,
      label: 'Harvest',
      color: '#f59e0b',
    });
  }

  // Add frost dates last so they don't interfere with planting dates
  if (guidance.lastFrostDate) {
    annotations.push({
      date: guidance.lastFrostDate,
      label: 'Last Frost',
      color: '#ef4444',
    });
  }

  if (guidance.firstFrostDate) {
    annotations.push({
      date: guidance.firstFrostDate,
      label: 'First Frost',
      color: '#6366f1',
    });
  }

  // Sort annotations by date
  annotations.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#4a5565] mb-2">Planting Calendar</h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f0fdf4] border border-[#86efac] rounded-full">
            <svg className="w-3.5 h-3.5 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[#166534] font-medium">
              Personalized for {profile.zipCode}
              {profile.growingZone && ` • Zone ${profile.growingZone}`}
            </span>
          </div>
        </div>
      </div>
      
      <div className="relative" style={{ height: chartHeight + 120 }}>
        {/* Temperature bars */}
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${totalWidth} ${chartHeight}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const temp = minTemp + (tempRange * (percent / 100));
            const y = chartHeight - (percent / 100) * chartHeight;
            return (
              <g key={percent}>
                <line
                  x1={0}
                  y1={y}
                  x2={totalWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
                <text
                  x={-5}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-[#6a7282]"
                  fontSize="10"
                >
                  {Math.round(temp)}°
                </text>
              </g>
            );
          })}

          {/* Temperature bars */}
          {temperatures.map((temp, index) => {
            const barHeight = ((temp - minTemp) / tempRange) * chartHeight;
            const x = index * chartWidth + barSpacing;
            const y = chartHeight - barHeight;
            
            // Color based on temperature
            let barColor = '#86efac'; // cool
            if (temp >= 70) barColor = '#fbbf24'; // warm
            if (temp >= 80) barColor = '#f97316'; // hot
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={barColor}
                  rx={4}
                  opacity={0.7}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-[#4a5565] font-medium"
                  fontSize="11"
                >
                  {Math.round(temp)}°
                </text>
              </g>
            );
          })}

          {/* Month labels */}
          {MONTHS.map((month, index) => (
            <text
              key={month}
              x={index * chartWidth + chartWidth / 2}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-xs fill-[#6a7282]"
              fontSize="11"
            >
              {month}
            </text>
          ))}

          {/* Annotations */}
          {annotations.map((annotation, idx) => {
            const x = getXPosition(annotation.date);
            const monthIndex = getMonthIndex(annotation.date);
            const temp = temperatures[monthIndex];
            const barHeight = ((temp - minTemp) / tempRange) * chartHeight;
            const y = chartHeight - barHeight - 10;
            
            // Alternate label position to avoid overlap
            const labelOffset = idx % 2 === 0 ? -25 : -40;
            const labelY = y + labelOffset;
            
            return (
              <g key={idx}>
                {/* Vertical line */}
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={chartHeight}
                  stroke={annotation.color}
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  opacity={0.5}
                />
                {/* Marker circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill={annotation.color}
                  stroke="white"
                  strokeWidth={2}
                />
                {/* Label */}
                <g transform={`translate(${x}, ${labelY})`}>
                  <rect
                    x={-45}
                    y={-10}
                    width={90}
                    height={18}
                    fill="white"
                    stroke={annotation.color}
                    strokeWidth={1.5}
                    rx={4}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    className="text-xs font-semibold"
                    fontSize="10"
                    fill={annotation.color}
                  >
                    {annotation.label}
                  </text>
                </g>
                {/* Date below label */}
                <text
                  x={x}
                  y={labelY + 25}
                  textAnchor="middle"
                  className="text-xs"
                  fontSize="9"
                  fill="#6a7282"
                >
                  {annotation.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#86efac' }}></div>
            <span className="text-[#6a7282]">Cool (&lt;70°F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            <span className="text-[#6a7282]">Warm (70-80°F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span className="text-[#6a7282]">Hot (&gt;80°F)</span>
          </div>
        </div>
      </div>
    </div>
  );
}


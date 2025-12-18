'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';

interface VehicleAvailabilityCalendarProps {
  vehicleId: string;
  bookedDates?: Date[];
  maintenanceDates?: Date[];
}

export function VehicleAvailabilityCalendar({
  vehicleId,
  bookedDates = [],
  maintenanceDates = [],
}: VehicleAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Month names
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Check if date is booked or in maintenance
  const getDateStatus = (day: number) => {
    const date = new Date(year, month, day);
    const dateString = date.toDateString();

    const isBooked = bookedDates.some(
      (bookedDate) => bookedDate.toDateString() === dateString
    );
    const isMaintenance = maintenanceDates.some(
      (maintenanceDate) => maintenanceDate.toDateString() === dateString
    );

    if (isMaintenance) return 'maintenance';
    if (isBooked) return 'booked';
    return 'available';
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Generate calendar days array
  const calendarDays = [];

  // Empty cells for days before first day of month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ day: null, status: null });
  }

  // Actual days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      status: getDateStatus(day),
      isToday: isToday(day),
      isPast: isPastDate(day),
    });
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-medium text-neutral-600 py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          if (dayInfo.day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const { day, status, isToday: isDayToday, isPast } = dayInfo;

          let cellClasses = 'aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ';

          if (isPast) {
            cellClasses += 'text-neutral-400 ';
          } else if (status === 'booked') {
            cellClasses += 'bg-error-100 text-error-700 font-medium ';
          } else if (status === 'maintenance') {
            cellClasses += 'bg-warning-100 text-warning-700 font-medium ';
          } else {
            cellClasses += 'bg-success-50 text-success-700 hover:bg-success-100 ';
          }

          if (isDayToday) {
            cellClasses += 'ring-2 ring-primary-500 ring-offset-1 ';
          }

          return (
            <div key={`day-${day}`} className={cellClasses}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success-50 border border-success-200" />
            <span className="text-neutral-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-error-100 border border-error-200" />
            <span className="text-neutral-600">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning-100 border border-warning-200" />
            <span className="text-neutral-600">Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded ring-2 ring-primary-500" />
            <span className="text-neutral-600">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

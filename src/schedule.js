// Bus 5150 Schedule Mapping Table & Window Filtering

export const BUS_LINE = "5150";

// Direction 1: Gaudi -> Calmette
export const GOING_TRIPS = [
  { sqy: "07:00", gaudi: "07:17", calmette: "07:29" },
  { sqy: "07:30", gaudi: "07:47", calmette: "07:59" },
  { sqy: "07:49", gaudi: "08:09", calmette: "08:21" },
  { sqy: "08:30", gaudi: "08:49", calmette: "09:01" },
  { sqy: "15:18", gaudi: "15:33", calmette: "15:45" },
  { sqy: "16:18", gaudi: "16:34", calmette: "16:46" },
  { sqy: "17:00", gaudi: "17:16", calmette: "17:28" },
  { sqy: "17:30", gaudi: "17:48", calmette: "18:00" },
  { sqy: "18:10", gaudi: "18:27", calmette: "18:39" },
  { sqy: "18:40", gaudi: "18:58", calmette: "19:10" }
];

// Direction 2: Calmette -> Gaudi
export const RETURN_TRIPS = [
  { calmette: "07:11", gaudi: "07:21", sqy: "07:39" },
  { calmette: "07:39", gaudi: "07:49", sqy: "08:10" },
  { calmette: "08:08", gaudi: "08:18", sqy: "08:39" },
  { calmette: "08:37", gaudi: "08:47", sqy: "09:08" },
  { calmette: "15:04", gaudi: "15:13", sqy: "15:30" },
  { calmette: "16:04", gaudi: "16:13", sqy: "16:30" },
  { calmette: "16:34", gaudi: "16:43", sqy: "17:01" },
  { calmette: "17:03", gaudi: "17:12", sqy: "17:30" },
  { calmette: "17:31", gaudi: "17:40", sqy: "17:58" },
  { calmette: "17:49", gaudi: "17:58", sqy: "18:16" },
  { calmette: "18:21", gaudi: "18:30", sqy: "18:48" }
];

/**
 * Checks if a given time string (HH:MM) falls into user commute windows:
 * Morning: 07:00 - 08:30
 * Afternoon/Evening: 15:18 - 18:40
 */
export function isInCommuteWindow(timeStr) {
  if (!timeStr) return false;
  const match = timeStr.match(/(\d{1,2})[h:](\d{2})/i);
  if (!match) return false;
  
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const mins = h * 60 + m;

  const morningStart = 7 * 60;        // 07:00
  const morningEnd = 8 * 60 + 35;     // 08:35
  const afternoonStart = 15 * 60 + 10; // 15:10
  const afternoonEnd = 18 * 60 + 45;   // 18:45

  return (mins >= morningStart && mins <= morningEnd) || (mins >= afternoonStart && mins <= afternoonEnd);
}

/**
 * Resolves an alert time string (e.g. "07:30", "07:47") to a full trip object
 */
export function resolveTrip(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2})[h:](\d{2})/i);
  if (!match) return null;

  const formattedTime = `${match[1].padStart(2, '0')}:${match[2]}`;

  // Search going trips
  for (const t of GOING_TRIPS) {
    if (t.sqy === formattedTime || t.gaudi === formattedTime || t.calmette === formattedTime) {
      return { direction: "Gaudi ➔ Calmette", ...t };
    }
  }

  // Search return trips
  for (const t of RETURN_TRIPS) {
    if (t.sqy === formattedTime || t.gaudi === formattedTime || t.calmette === formattedTime) {
      return { direction: "Calmette ➔ Gaudi", ...t };
    }
  }

  return null;
}

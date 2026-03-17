import React, { useEffect } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

const BOARD_ID = 18402229458;
const TIME_TRACKING_COLUMN_ID = "duration_mm124cn2";
const TOTAL_COLUMN_ID = "numeric_mm12c929";

function secondsToHours(seconds) {
  return (seconds / 3600).toFixed(2);
}

function getTotalSeconds(timeTrackingValue) {
  if (!timeTrackingValue || !timeTrackingValue.history) return 0;

  let total = 0;
  timeTrackingValue.history.forEach(session => {
    if (session.started_at && session.ended_at) {
      total += (new Date(session.ended_at) - new Date(session.started_at)) / 1000;
    }
  });
  return total;
}

export default function App() {
  useEffect(() => {
    const interval = setInterval(syncTimeToNumbers, 10000);
    return () => clearInterval(interval);
  }, []);

  async function syncTimeToNumbers() {
    const query = `
      query {
        boards(ids: ${BOARD_ID}) {
          items {
            id
            column_values(ids: ["${TIME_TRACKING_COLUMN_ID}"]) {
              id
              value
            }
          }
        }
      }
    `;

    const res = await monday.api(query);
    const items = res.data.boards[0].items;

    for (const item of items) {
      const col = item.column_values[0];
      if (!col.value) continue;

      const parsed = JSON.parse(col.value);
      if (parsed.running === true) continue;

      const totalSeconds = getTotalSeconds(parsed);
      if (totalSeconds === 0) continue;

      const totalHours = secondsToHours(totalSeconds);
      const mutation = `
        mutation {
          change_simple_column_value(
            board_id: ${BOARD_ID},
            item_id: ${item.id},
            column_id: "${TOTAL_COLUMN_ID}",
            value: "${totalHours}"
          ) {
            id
          }
        }
      `;
      await monday.api(mutation);
    }
  }

  return <div>⏱ Time Sync Running...</div>;
}

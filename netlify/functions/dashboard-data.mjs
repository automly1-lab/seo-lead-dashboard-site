import { buildRuntimeDataFromSheets, fetchAllSheetData } from "./_shared/sheets.mjs";

export default async () => {
  try {
    const sheetData = await fetchAllSheetData();
    const runtime = buildRuntimeDataFromSheets(sheetData);
    return new Response(JSON.stringify(runtime), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Unable to load dashboard data",
      details: error instanceof Error ? error.message : "unknown_error",
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
};

export const config = {
  path: "/api/dashboard-data",
};

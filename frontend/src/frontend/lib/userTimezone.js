"use client";

export function getUserTimezoneInfo() {
  if (typeof window === "undefined") {
    return {
      tz: "UTC",
      region: "Hora Local",
      gmtOffset: "",
      fullLabel: "Horarios en tu hora local del dispositivo",
      shortLabel: "Hora local",
    };
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const now = new Date();
    
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMinutes);
    const hours = Math.floor(absMin / 60);
    const gmtOffset = `GMT${sign}${hours}`;

    let region = tz.split("/")[1]?.replace(/_/g, " ") || tz;
    if (tz.includes("Bogota")) region = "Colombia";
    else if (tz.includes("Madrid")) region = "España (Madrid)";
    else if (tz.includes("Canary")) region = "España (Canarias)";
    else if (tz.includes("New_York")) region = "EE.UU. (Este / NY)";
    else if (tz.includes("Los_Angeles")) region = "EE.UU. (Pacífico / LA)";
    else if (tz.includes("Chicago")) region = "EE.UU. (Central)";
    else if (tz.includes("Mexico_City")) region = "México (CDMX)";
    else if (tz.includes("Caracas")) region = "Venezuela";
    else if (tz.includes("Buenos_Aires")) region = "Argentina";
    else if (tz.includes("Santiago")) region = "Chile";
    else if (tz.includes("Lima")) region = "Perú";
    else if (tz.includes("London")) region = "Reino Unido (Londres)";
    else if (tz.includes("Paris")) region = "Francia (París)";

    return {
      tz,
      region,
      gmtOffset,
      fullLabel: `Horarios en tu hora local: ${region} (${gmtOffset})`,
      shortLabel: `${region} (${gmtOffset})`,
    };
  } catch (e) {
    return {
      tz: "UTC",
      region: "Hora Local",
      gmtOffset: "",
      fullLabel: "Horarios en tu hora local del dispositivo",
      shortLabel: "Hora local",
    };
  }
}

const sectionName = process.env.NEXT_PUBLIC_DAV_SECTION_NAME || "Pfarrkirchen";
const appName = process.env.NEXT_PUBLIC_DAV_APP_NAME || `DAV ${sectionName}`;

export const siteConfig = {
  sectionName,
  appName,
  shortName: process.env.NEXT_PUBLIC_DAV_SHORT_NAME || "DAV PAN",
  description:
    process.env.NEXT_PUBLIC_DAV_APP_DESCRIPTION ||
    `App für ${appName} - Touren, Material, Kalender`,
  manifestPath: "/manifest.webmanifest",
  logoPath: process.env.NEXT_PUBLIC_DAV_LOGO_PATH || "/JDAV-Logo-grün-ganz.svg",
  logoAlt: `${appName} Logo`,
  defaultMeetingPoint:
    process.env.NEXT_PUBLIC_DAV_DEFAULT_MEETING_POINT ||
    `P&R Parkplatz ${sectionName}`,
  notificationTitle: appName,
  icsProductId: `-//${appName}//Tour Management//DE`,
};

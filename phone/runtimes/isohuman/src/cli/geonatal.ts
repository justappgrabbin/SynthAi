import { calculateGeonatalChart } from "../astrology/GeonatalCalculator";

const [timestampValue, latitudeValue, longitudeValue] = process.argv.slice(2);

if (!timestampValue || latitudeValue === undefined || longitudeValue === undefined) {
  process.stderr.write("Usage: geonatal <ISO timestamp> <latitude> <longitude>\n");
  process.exitCode = 2;
} else {
  try {
    const timestamp = new Date(timestampValue);
    if (Number.isNaN(timestamp.getTime())) throw new Error("Invalid timestamp");
    const chart = calculateGeonatalChart(timestamp, {
      latitude: Number(latitudeValue),
      longitude: Number(longitudeValue),
    });
    process.stdout.write(JSON.stringify(chart));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}


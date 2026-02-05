
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

const isLocal = process.env.LOCALSTACK_HOSTNAME;

const client = new DynamoDBClient(
  isLocal
    ? { endpoint: "http://localstack:4566", region: "us-east-1" }
    : { region: "us-east-1" }
);

const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log("Starting sync from Open Charge Map...");

  try {
    const chargers = await fetchFromOCM();
    console.log(`Fetched ${chargers.length} chargers from OCM`);

    const savedCount = await saveToDatabase(chargers);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Sync complete",
        fetchedFromOCM: chargers.length,
        savedToDatabase: savedCount,
      }),
    };
  } catch (error) {
    console.error("Sync failed:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function fetchFromOCM() {
  const apiKey = process.env.OCM_API_KEY;
  const baseUrl = process.env.OCM_URL;

  const url = `${baseUrl}?key=${apiKey}&countrycode=RS&maxresults=500&compact=true&verbose=false`;

  console.log("Fetching from:", url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OCM API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

async function saveToDatabase(chargers) {
  const tableName = process.env.CHARGERS_TABLE;
  let savedCount = 0;

  const chunks = chunkArray(chargers, 25);

  for (const chunk of chunks) {
    const writeRequests = chunk.map((charger) => ({
      PutRequest: {
        Item: transformCharger(charger),
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: writeRequests,
        },
      })
    );

    savedCount += chunk.length;
    console.log(`Saved batch: ${savedCount}/${chargers.length}`);
  }

  return savedCount;
}

function transformCharger(ocmCharger) {
  const address = ocmCharger.AddressInfo || {};

  let town = address.Town || "Unknown";
  if (["Beograd", "Belgrad", "Belgrade"].includes(town)) {
    town = "Belgrade";
  }

  return {
    chargerId: String(ocmCharger.ID),
    town: town,
    title: address.Title || "Unknown Charger",
    addressLine1: address.AddressLine1 || "",
    postcode: address.Postcode || "",
    latitude: address.Latitude || 0,
    longitude: address.Longitude || 0,
    numberOfPoints: ocmCharger.NumberOfPoints || 1,
    isRecentlyVerified: ocmCharger.IsRecentlyVerified || false,
    dateLastVerified: ocmCharger.DateLastVerified || null,
  };
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const isLocal = process.env.LOCALSTACK_HOSTNAME;

const client = new DynamoDBClient(
  isLocal
    ? { endpoint: "http://localstack:4566", region: "us-east-1" }
    : { region: "us-east-1" }
);

const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  const town = event.pathParameters?.town;

  if (!town) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Town parameter is required" }),
    };
  }

  const decodedTown = decodeURIComponent(town);
  console.log(`Searching for chargers in: ${decodedTown}`);

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.CHARGERS_TABLE,
        IndexName: "TownIndex",                
        KeyConditionExpression: "town = :town",
        ExpressionAttributeValues: {
          ":town": decodedTown,
        },
      })
    );

    const chargers = result.Items || [];
    console.log(`Found ${chargers.length} chargers in ${decodedTown}`);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        town: decodedTown,
        count: chargers.length,
        chargers: chargers,
      }),
    };
  } catch (error) {
    console.error("Query failed:", error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

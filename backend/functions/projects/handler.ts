import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE = process.env.TABLE_NAME!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-user-id",
  "Content-Type": "application/json",
};

function ok(body: unknown, status = 200): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

function err(message: string, status = 400): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ error: message }) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method.toUpperCase();

  // API Gateway HTTP API handles OPTIONS preflight automatically via CorsConfiguration
  // but return early here as a safety net for any direct invocations
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const userId = (event.headers?.["x-user-id"] ?? "anonymous").slice(0, 128);
  const path = event.rawPath ?? "/";
  const projectId = event.pathParameters?.id;

  try {
    // GET /projects — lista todas as obras do usuário
    if (method === "GET" && path === "/projects") {
      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
        }),
      );
      // Remove chaves internas do DynamoDB do retorno
      const items = (res.Items ?? []).map(({ userId: _u, projectId: _p, ...rest }) => rest);
      return ok(items);
    }

    // POST /projects — importar / substituir todas as obras (batch upsert)
    if (method === "POST" && path === "/projects") {
      const projects = JSON.parse(event.body ?? "[]");
      if (!Array.isArray(projects)) return err("Body deve ser um array de obras.");

      // DynamoDB BatchWrite aceita 25 itens por vez
      for (let i = 0; i < projects.length; i += 25) {
        const chunk = projects.slice(i, i + 25);
        await ddb.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: chunk.map((p: Record<string, unknown>) => ({
                PutRequest: { Item: { userId, projectId: p.id as string, ...p } },
              })),
            },
          }),
        );
      }
      return ok({ imported: projects.length }, 201);
    }

    // DELETE /projects — apaga todas as obras do usuário
    if (method === "DELETE" && path === "/projects") {
      const existing = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
          ProjectionExpression: "projectId",
        }),
      );
      const keys = (existing.Items ?? []).map((i) => i.projectId as string);
      for (let i = 0; i < keys.length; i += 25) {
        const chunk = keys.slice(i, i + 25);
        await ddb.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: chunk.map((id) => ({
                DeleteRequest: { Key: { userId, projectId: id } },
              })),
            },
          }),
        );
      }
      return ok({ deleted: keys.length });
    }

    // PUT /projects/{id} — cria ou atualiza uma obra (inclui gastos)
    if (method === "PUT" && projectId) {
      const project = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: { userId, projectId, ...project, id: projectId },
        }),
      );
      return ok(project);
    }

    // DELETE /projects/{id} — apaga uma obra
    if (method === "DELETE" && projectId) {
      await ddb.send(
        new DeleteCommand({ TableName: TABLE, Key: { userId, projectId } }),
      );
      return ok({ deleted: projectId });
    }

    return err("Rota não encontrada.", 404);
  } catch (e) {
    console.error(e);
    return err(String(e), 500);
  }
};

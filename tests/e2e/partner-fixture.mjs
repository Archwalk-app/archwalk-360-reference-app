// Isolated Partner transport fixtures. Never uses real credentials.
import { createServer } from "node:http";

let listingState = "published";
const experiences = new Map();
let experienceSeq = 0;

function send(response, status, body, headers = {}) {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json",
    ...headers,
  });
  response.end(json);
}

function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function listingExperience() {
  return {
    experience_id: "166ac0f6-28c0-4858-92fc-f06243b0becc",
    public_id: "1e00029c-d4ff-4a22-8d5b-c95d10ae3f57",
    name: "Hallwyl Museum",
    external_resource_id: "sunset-villa-001",
    lifecycle_status: "active",
    publication_status: listingState,
    draft_revision: 3,
  };
}

function identityKey(body) {
  return `${body.external_customer_id || ""}:${body.external_resource_id}`;
}

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3216");

  if (url.pathname === "/fixture-state" && request.method === "POST") {
    listingState = url.searchParams.get("state");
    response.end("ok");
    return;
  }
  if (url.pathname === "/health") {
    response.end("ok");
    return;
  }

  if (url.pathname === "/api/v1/360/experiences" && request.method === "GET") {
    const resource = url.searchParams.get("external_resource_id");
    if (resource === "sunset-villa-001") {
      if (listingState === "unavailable") {
        send(response, 403, { detail: { message: "SECRET CONFIGURATION DETAIL" } });
        return;
      }
      send(response, 200, { items: [listingExperience()] });
      return;
    }
    const customer = url.searchParams.get("external_customer_id") || "";
    const found = [...experiences.values()].find(
      (item) =>
        item.external_resource_id === resource &&
        (item.external_customer_id || "") === customer,
    );
    send(response, 200, { items: found ? [found] : [] });
    return;
  }

  if (url.pathname === "/api/v1/360/experiences" && request.method === "POST") {
    const body = await readBody(request);
    if (body.external_resource_id === "sunset-villa-001") {
      send(response, 200, listingExperience());
      return;
    }
    const key = identityKey(body);
    const existing = experiences.get(key);
    if (existing) {
      send(response, 200, existing);
      return;
    }
    experienceSeq += 1;
    const created = {
      experience_id: `exp_${experienceSeq}`,
      public_id: `pub_${experienceSeq}`,
      name: body.name,
      external_resource_id: body.external_resource_id,
      external_customer_id: body.external_customer_id || null,
      lifecycle_status: "active",
      publication_status: "unpublished",
      draft_revision: 1,
    };
    experiences.set(key, created);
    send(response, 201, created);
    return;
  }

  if (url.pathname === "/api/v1/360/creator-sessions" && request.method === "POST") {
    const body = await readBody(request);
    const experience = [...experiences.values()].find(
      (item) => item.experience_id === body.experience_id,
    );
    const sessionId = experience
      ? `sess_${experience.external_resource_id}`
      : "sess_unknown";
    send(
      response,
      201,
      {
        api_id: sessionId,
        token: `aw360_cs_${sessionId}.secret`,
        origin: body.origin,
        permitted_actions: body.permitted_actions || [],
        status: "active",
      },
    );
    return;
  }

  if (url.pathname.startsWith("/aw360/c/") && request.method === "GET") {
    const sessionApiId = url.pathname.slice("/aw360/c/".length);
    const resourceId = sessionApiId.replace(/^sess_/, "");
    send(
      response,
      200,
      `<!doctype html><html><body>
        <p>Fixture Creator</p>
        <button id="publish-demo">Publish demo</button>
        <script>
          const SOURCE = "archwalk360";
          const resourceId = ${JSON.stringify(resourceId)};
          parent.postMessage({ source: SOURCE, version: 1, type: "creator:ready-for-init" }, "*");
          window.addEventListener("message", (event) => {
            if (!event.data || event.data.source !== SOURCE) return;
            if (event.data.type === "creator:init") {
              parent.postMessage({ source: SOURCE, version: 1, type: "creator:ready" }, "*");
            }
          });
          document.getElementById("publish-demo").addEventListener("click", async () => {
            await fetch("/fixture-publish?resource=" + encodeURIComponent(resourceId), { method: "POST" });
            parent.postMessage({ source: SOURCE, version: 1, type: "creator:published", publicId: "pub_" + resourceId }, "*");
          });
        </script>
      </body></html>`,
    );
    return;
  }

  if (url.pathname === "/fixture-publish" && request.method === "POST") {
    const resource = url.searchParams.get("resource");
    for (const [key, experience] of experiences) {
      if (experience.external_resource_id === resource) {
        experience.publication_status = "published";
        experience.public_id = `pub_${resource}`;
        experiences.set(key, experience);
      }
    }
    response.end("ok");
    return;
  }

  if (url.pathname.startsWith("/aw360/v/") && request.method === "GET") {
    send(response, 200, "<!doctype html><html><body><p>Fixture Viewer</p></body></html>");
    return;
  }

  response.writeHead(404);
  response.end();
}).listen(3216, "127.0.0.1");

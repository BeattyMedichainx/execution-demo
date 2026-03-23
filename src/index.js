export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/") {
      return new Response(renderHtml(), {
        headers: {
          "content-type": "text/html; charset=UTF-8",
          ...securityHeaders(),
        },
      });
    }

    if (url.pathname === "/api/status") {
      return json({ ok: true, service: "execution-demo" });
    }

    const access = request.headers.get("x-demo-access") || "";
    if (url.pathname.startsWith("/api/") && access !== env.DEMO_ACCESS_KEY) {
      return json({ error: "unauthorized" }, 401);
    }

    if (url.pathname === "/api/allow" && request.method === "POST") {
      const execId = `exec_demo_${Date.now()}_allow`;
      const seed = await backendPost(env, "/v1/control/seed", {
        execution_id: execId,
        tenant_id: env.BACKEND_TARGET_TENANT,
        decision_status: "ALLOW",
        verified: true,
        trust_score: 100,
        explanation: "Demo authorized execution"
      });
      const explain = await backendPost(env, "/v1/control/explain", {
        execution_id: execId
      });
      return json({ mode: "authorized", seed, explain });
    }

    if (url.pathname === "/api/deny" && request.method === "POST") {
      const execId = `exec_demo_${Date.now()}_deny`;
      const seed = await backendPost(env, "/v1/control/seed", {
        execution_id: execId,
        tenant_id: env.BACKEND_TARGET_TENANT,
        decision_status: "ALLOW",
        verified: true,
        trust_score: 100,
        explanation: "Demo unauthorized execution baseline"
      });
      const tamper = await backendPost(env, "/v1/control/seed/tamper", {
        execution_id: execId,
        field: "decision_status",
        value: "DENY"
      });
      const explain = await backendPost(env, "/v1/control/explain", {
        execution_id: execId
      });
      return json({ mode: "unauthorized", seed, tamper, explain });
    }

    if (url.pathname === "/api/proof" && request.method === "GET") {
      const proof = await backendGet(env, "/v1/control/audit/anchor");
      return json({ mode: "proof", proof });
    }

    return json({ error: "not_found" }, 404);
  }
};

async function backendGet(env, path) {
  const res = await fetch(`${env.BACKEND_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "x-api-key": env.BACKEND_API_KEY,
      "x-tenant-id": env.BACKEND_TENANT_ID
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function backendPost(env, path, body) {
  const res = await fetch(`${env.BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.BACKEND_API_KEY,
      "x-tenant-id": env.BACKEND_TENANT_ID
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...corsHeaders(),
      ...securityHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-demo-access"
  };
}

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    "cache-control": "no-store"
  };
}

function renderHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>11/11 Execution OS — Live Demo</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{--bg:#0b1020;--panel:#121a31;--panel2:#182242;--line:#2d3a64;--text:#e8eefc;--muted:#a6b3d1;--accent:#72e6ff;--accent2:#8f7cff}
*{box-sizing:border-box} body{margin:0;background:linear-gradient(180deg,#09101d 0%,#0b1020 100%);color:var(--text);font-family:Inter,system-ui}
.wrap{max-width:1100px;margin:0 auto;padding:28px}.hero,.card{background:rgba(18,26,49,.92);border:1px solid var(--line);border-radius:18px;padding:20px}
.hero{margin-bottom:18px} h1{margin:0 0 8px;font-size:34px}.sub{color:var(--muted);line-height:1.5}
.gate,.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
input{flex:1;min-width:260px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--text)}
button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--accent2),var(--accent));color:#08111f}
.secondary{background:var(--panel2);color:var(--text);border:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.out{margin-top:16px;background:#0b1327;border:1px solid var(--line);border-radius:14px;padding:14px;min-height:220px;white-space:pre-wrap;overflow:auto;font-family:ui-monospace,monospace;font-size:12px}
.banner{margin-top:14px;padding:12px;border-radius:12px;background:#101834;border:1px solid var(--line);color:var(--muted)}
.hide{display:none}@media (max-width:900px){.grid{grid-template-columns:1fr}h1{font-size:28px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>11/11 Execution OS — Live Demo</h1>
    <div class="sub">Execution is verified before it runs. Any invalid action is rejected, recorded, and provable in real time.</div>
    <div class="gate">
      <input id="access" placeholder="Enter demo access key" />
      <button onclick="unlock()">Unlock Demo</button>
    </div>
    <div id="banner" class="banner">Invite-only access</div>
  </div>

  <div id="app" class="hide">
    <div class="grid">
      <div class="card">
        <h2>Authorized Execution</h2>
        <div class="sub">Run a valid request through the execution system.</div>
        <div class="actions"><button onclick="runAllow()">Run Authorized Execution</button></div>
      </div>
      <div class="card">
        <h2>Unauthorized Execution</h2>
        <div class="sub">Trigger an invalid path and watch the system reject it.</div>
        <div class="actions"><button onclick="runDeny()">Attempt Unauthorized Execution</button></div>
      </div>
      <div class="card">
        <h2>Cryptographic Proof</h2>
        <div class="sub">Retrieve the latest audit anchor and proof state.</div>
        <div class="actions"><button onclick="runProof()">View Cryptographic Proof</button></div>
      </div>
    </div>
    <div id="out" class="out">{}</div>
  </div>
</div>

<script>
let DEMO_ACCESS = "";
function setBanner(msg){document.getElementById("banner").textContent=msg}
function setOut(obj){document.getElementById("out").textContent=JSON.stringify(obj,null,2)}
async function api(path, opts={}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: {"content-type":"application/json","x-demo-access":DEMO_ACCESS},
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw:text }; }
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
function unlock(){
  DEMO_ACCESS = document.getElementById("access").value.trim();
  if(!DEMO_ACCESS){setBanner("Enter access key");return;}
  document.getElementById("app").classList.remove("hide");
  setBanner("Access granted");
  setOut({status:"ready"});
}
async function runAllow(){try{setBanner("Running authorized execution..."); const data=await api("/api/allow",{method:"POST"}); setOut(data); setBanner("Authorized execution verified");}catch(e){setBanner("Authorized execution failed");setOut({error:String(e)})}}
async function runDeny(){try{setBanner("Running unauthorized execution..."); const data=await api("/api/deny",{method:"POST"}); setOut(data); setBanner("Unauthorized execution rejected and recorded");}catch(e){setBanner("Unauthorized execution failed");setOut({error:String(e)})}}
async function runProof(){try{setBanner("Loading cryptographic proof..."); const data=await api("/api/proof"); setOut(data); setBanner("Proof loaded");}catch(e){setBanner("Proof request failed");setOut({error:String(e)})}}
</script>
</body>
</html>`;
}

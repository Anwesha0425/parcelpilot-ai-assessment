const fs = require('fs');
async function testAPI() {
  console.log("Testing Northstar Customer query...");
  // 1. Get token
  const authRes = await fetch("http://localhost:3000/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@northstar.com", password: "pass" })
  });
  const { token } = await authRes.json();
  
  // 2. Chat query
  const chatRes = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Can I cancel ORD-1001 without a fee?" }]
    })
  });
  
  const data = await chatRes.json();
  console.log("\n--- API Response for ORD-1001 ---");
  console.log("Text:", data.text);
  console.log("Tool Calls:", data.tool_calls.map(t => t.name).join(", "));
  console.log("---------------------------------");
}
testAPI().catch(console.error);

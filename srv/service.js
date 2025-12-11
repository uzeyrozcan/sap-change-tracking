const cds = require('@sap/cds');
require('dotenv').config();
const { fileSearchTool, Agent, Runner, withTrace } = require('@openai/agents');
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { functionTool } = require("@openai/agents");


const GOLIVE_SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/golive.md"),
  "utf8"
);

module.exports = cds.service.impl(async function () {
  const { messages } = this.entities;

  // ✅ Vector Store dosyasını bağla
  const goliveDocs = fileSearchTool([
    process.env.VECTOR_STORE_ID
  ]);

  const createActivityTool = {
    type: "function",
    name: "create_activity",
    description: "Onaydan sonra aktivite kaydı oluşturur.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string" },
        companyId: { type: "string" },
        hours: { type: "number" },
        description: { type: "string" }
      },
      required: ["date", "companyId", "hours"]
    },
    execute: async ({ date, companyId, hours, description }) => {
      const res = await fetch("http://localhost:4005/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          companyId,
          hours,
          description: description ?? null,
          source: "golive-assistant"
        })
      });
      return await res.json();
    }
  };

  const agent = new Agent({
    name: "GoLiveAssistant",
    instructions: GOLIVE_SYSTEM_PROMPT,
    tools: [ goliveDocs,
      createActivityTool
    ],
    model: "gpt-4.1",
    modelSettings: {
      temperature: 0.6,
      maxTokens: 2048
    }
  });

  /*this.on('createActivity', async (req) => {
      const { date, companyId, hours, description } = req.data;

      try {
        const res = await fetch(`${process.env.ACTIVITIES_API_URL}/activities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            date,
            companyId,
            hours,
            description,
            source: "golive-assistant"
          })
        });

        const json = await res.json();
        return `✅ MOCK Aktivite oluşturuldu. ID: ${json.id}`;
      } catch (err) {
        console.error("MOCK API Error:", err);
        return "⚠️ Mock API'ye ulaşılamadı.";
      }
    });*/



  this.on('ask', async (req) => {
    const userMessage = req.data.question;

    const conversation = [
      {
        role: "user",
        content: [{ type: "input_text", text: userMessage }]
      }
    ];

    const runner = new Runner();
    const result = await runner.run(agent, conversation);

    const reply = result.finalOutput;

    await INSERT.into(messages).entries({ question: userMessage, answer: reply });

    return { answer: reply };
  });
});

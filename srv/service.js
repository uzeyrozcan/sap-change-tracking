const cds = require('@sap/cds');
const OpenAI = require('openai');
require('dotenv').config();

module.exports = cds.service.impl(async function() {
    
    const { ChatMessages, ChatSessions, Activities, Plans, Companies } = this.entities;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- BEFORE HOOKS: Validation & Security ---
    
    this.before('CREATE', 'Activities', async (req) => {
        const { hours, description, date } = req.data;
        
        // Zorunlu alan kontrolü
        if (!description || description.trim() === "") {
            req.error(400, "Açıklama alanı zorunludur");
        }
        if (!hours || hours <= 0) {
            req.error(400, "Saat değeri pozitif olmalıdır");
        }
        if (!date) {
            req.error(400, "Tarih alanı zorunludur");
        }
        
        console.log(`✅ Validation OK: Activity for ${hours} hours on ${date}`);
    });

    this.before('CREATE', 'Plans', async (req) => {
        const { projectName, hours, date } = req.data;
        
        if (!projectName || projectName.trim() === "") {
            req.error(400, "Proje adı zorunludur");
        }
        if (!hours || hours <= 0) {
            req.error(400, "Saat değeri pozitif olmalıdır");
        }
        if (!date) {
            req.error(400, "Tarih alanı zorunludur");
        }
        
        console.log(`✅ Validation OK: Plan for ${projectName}`);
    });

    // --- AFTER HOOKS: Audit Logging ---
    
    this.after('CREATE', 'Activities', async (data, req) => {
        const user = req.user?.id || 'anonymous';
        console.log(`📝 AUDIT: User ${user} created Activity ID=${data.ID} for company ${data.companyId}`);
        // Gerçek ortamda: Cloud Logging service'e kaydet
    });

    this.after('CREATE', 'Plans', async (data, req) => {
        const user = req.user?.id || 'anonymous';
        console.log(`📅 AUDIT: User ${user} created Plan ID=${data.ID} for project ${data.projectName}`);
    });

    this.after('DELETE', 'ChatSessions', async (data, req) => {
        const user = req.user?.id || 'anonymous';
        console.log(`🗑️ AUDIT: User ${user} deleted ChatSession ID=${data.ID}`);
    });

    // ACTION: ask
    this.on('ask', async (req) => {
        const { question, sessionId, assistantId } = req.data;
        const { ChatMessages, ChatSessions, Assistants } = this.entities;

        try {
            // 1. Asistan ve Sistem Promptunu Çek
            const activeAssistant = await SELECT.one.from(Assistants).where({ ID: assistantId });
            
            // 2. OpenAI Mesaj Geçmişini ve Fonksiyonları (Tools) Tanımla
            const messages = [
                { role: "system", content: activeAssistant.systemPrompt },
                { role: "user", content: question }
            ];

            // 3. GPT'ye Soru ve Kullanabileceği Araçları Gönder
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                tools: [
                    {
                    type: "function",
                    function: {
                        name: "get_companies",
                        description: "Şirket listesini getirir",
                        parameters: {
                        type: "object",
                        properties: {},
                        required: []
                        }
                    }
                    },
                    {
                    type: "function",
                    function: {
                        name: "save_activity",
                        description: "Aktiviteyi kaydeder",
                        parameters: {
                        type: "object",
                        properties: {
                            activity: { type: "string" }
                        },
                        required: ["activity"]
                        }
                    }
                    },
                    {
                    type: "function",
                    function: {
                        name: "create_plan",
                        description: "Plan oluşturur",
                        parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string" }
                        },
                        required: ["date"]
                        }
                    }
                    }
                ],
                tool_choice: "auto"
                });


            let responseMessage = response.choices[0].message;

            // 4. GPT BİR FONKSİYON ÇAĞIRMAK İSTİYOR MU? (Tool Calls)
            if (responseMessage.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);
                    let functionResult;

                    // --- FONKSİYON MAPPING: GPT ADI -> CAP MANTIĞI ---
                    if (functionName === "get_companies") {
                        const search = args.search_text || "";
                        functionResult = await SELECT.from(this.entities.Companies)
                            .where`name like ${'%' + search + '%'}`;
                    } 
                    else if (functionName === "save_activity") {
                        // Senin 'createActivity' action'ını tetikler
                        functionResult = await this.on('createActivity', { 
                            data: { ...args, company_ID: args.company_id } 
                        });
                    }
                    else if (functionName === "get_activity_report") {
                        // Mevcut rapor action'ını tetikler
                        functionResult = await this.on('getActivityReport', { data: { period: args.period } });
                    }

                    // Sonucu GPT'ye geri gönder ki son cevabını versin
                    // (Assistant API kullanıyorsan submitToolOutputs adımı buradadır)
                }
            }

            return { answer: responseMessage.content };

        } catch (error) {
            req.error(500, "Asistan İşlem Hatası: " + error.message);
        }
    });

    // ACTION: createActivity
    this.on('createActivity', async (req) => {
        const { companyId, hours, description, date } = req.data;

        try {
            // Şirket adını bul (opsiyonel)
            let companyName = "Bilinmeyen Firma";
            if (companyId) {
                const comp = await SELECT.one.from(Companies).where({ ID: companyId });
                if (comp && comp.name) companyName = comp.name;
            }

            // ID oluştur ve kaydet
            const newId = cds.utils.uuid();
            const entry = {
                ID: newId,
                companyId,
                companyName,
                hours,
                description,
                date,
                createdAt: new Date().toISOString()
            };

            await INSERT.into(Activities).entries(entry);
            const saved = await SELECT.one.from(Activities).where({ ID: newId });
            return saved;

        } catch (error) {
            console.error("createActivity Hatası:", error);
            req.error(500, "Aktivite kaydında hata: " + error.message);
        }
    });

    // ACTION: createPlan
    this.on('createPlan', async (req) => {
        const { projectName, date, hours } = req.data;

        try {
            const newId = cds.utils.uuid();
            const entry = {
                ID: newId,
                projectName,
                date,
                hours,
                status: "Planned",
                createdAt: new Date().toISOString()
            };

            await INSERT.into(Plans).entries(entry);
            const saved = await SELECT.one.from(Plans).where({ ID: newId });
            return saved;

        } catch (error) {
            console.error("createPlan Hatası:", error);
            req.error(500, "Plan oluşturma hatası: " + error.message);
        }
    });

    // ACTION: getActivityReport
    this.on('getActivityReport', async (req) => {
        try {
            const acts = await SELECT.from(Activities);

            let totalHours = 0;
            const reportMap = {};

            for (const act of acts) {
                const key = act.companyName || "Diğer";
                if (!reportMap[key]) reportMap[key] = 0;
                reportMap[key] += Number(act.hours || 0);
                totalHours += Number(act.hours || 0);
            }

            const chartData = Object.keys(reportMap).map(k => ({ Project: k, Hours: reportMap[k] }));
            chartData.sort((a, b) => b.Hours - a.Hours);

            return {
                summary_text: `Şu ana kadar toplam ${totalHours} saat aktivite girişi yapıldı. En yoğun firma ${chartData[0]?.Project || "-"}.`,
                chart_data: chartData
            };

        } catch (error) {
            console.error("getActivityReport Hatası:", error);
            req.error(500, "Rapor oluşturma hatası: " + error.message);
        }
    });
});
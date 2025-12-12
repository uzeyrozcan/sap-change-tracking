import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import ScrollContainer from "sap/m/ScrollContainer";
import FeedInput from "sap/m/FeedInput";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import List from "sap/m/List";
import ListBinding from "sap/ui/model/ListBinding";
import Fragment from "sap/ui/core/Fragment";
import Control from "sap/ui/core/Control";
import ResponsivePopover from "sap/m/ResponsivePopover";
import formatter from "../model/formatter";



// --- TİP TANIMLAMALARI ---
interface ChatMessage {
    Author: string;
    AuthorPic: string;
    Type: string;
    Date: Date;
    Text: string;
    ChartData?: any[];
    HasChart?: boolean;
}

// --- SABİT MOCK VERİLER (Global Scope) ---
const MOCK_DB_COMPANIES = [
    { "id": "cmp_001", "name": "GoLive A.Ş.", "sector": "Yazılım", "city": "İstanbul" },
    { "id": "cmp_002", "name": "ACME Ltd.", "sector": "Üretim", "city": "İzmir" },
    { "id": "cmp_003", "name": "TechNova Bilişim", "sector": "Danışmanlık", "city": "Ankara" },
    { "id": "cmp_004", "name": "DataSpark Analytics", "sector": "Veri Analitiği", "city": "Bursa" },
    { "id": "cmp_005", "name": "MediCore Sağlık", "sector": "Sağlık", "city": "İstanbul" },
    { "id": "cmp_006", "name": "GreenEdge Enerji", "sector": "Enerji", "city": "Eskişehir" },
    { "id": "cmp_007", "name": "NovaLojistik A.Ş.", "sector": "Lojistik", "city": "Kocaeli" },
    { "id": "cmp_008", "name": "BlueBay Finans", "sector": "Finans", "city": "İstanbul" },
    { "id": "cmp_009", "name": "AgroTech Tarım", "sector": "Tarım", "city": "Konya" },
    { "id": "cmp_010", "name": "SkyLink Telekom", "sector": "Telekom", "city": "İstanbul" }
];

/**
 * @namespace aiassistant.controller
 */
export default class aiassistant extends Controller {

    // ⚠️ GÜVENLİK UYARISI: API Key'i buraya yapıştır
    private _sOpenAIKey: string = "OPENAI_API_KEY"; 
    
    // Aktif Asistan ve Thread Yönetimi
    private _sActiveAssistantID: string | null = null; // Dinamik değişecek
    private _sThreadID: string | null = null;
    
    // Varsayılan Asistan (Uygulama açılınca seçili olan - Aktivite Asistanı ID'ni buraya yaz)
    private _sDefaultAssistantID: string = "ASSISTANT_ID"; 

    private _oPopover: Promise<ResponsivePopover> | null = null;
    public formatter = formatter;
    private _sBackendURL: string = "";

    public onInit(): void {
        const oData = {
            chatModel: {
                // Başlangıç verileri gerekirse buraya
            },
            CurrentSession: {
                Messages: [],
                ThreadID: null
            },
            ChatHistory: []
        };
        const oModel = new JSONModel(oData);
        this.getView()?.setModel(oModel, "chatModel");

        // 2. Geçmişi Yükle
        this.loadChatHistory();

        // 3. Varsayılan asistanı ayarla
        this._sActiveAssistantID = this._sDefaultAssistantID;

        // (Eski koddaki "Component üzerinden model çekme" ve "if check" kısımlarını sildik, 
        // çünkü yukarıda modeli zaten dolu dolu yarattık.)

        // 4. CSS Yükleme
        const sCssPath = sap.ui.require.toUrl("sap-change-tracking/app/aiassistant/webapp/css/style.css");
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = sCssPath;
        document.head.appendChild(link);

        // 5. Enter Tuşu Desteği
        const oFeedInput = this.byId("chatInput") as FeedInput;
        if (oFeedInput) {
            oFeedInput.addEventDelegate({
                onsapenter: (oEvent: any) => {
                    if (!oEvent.shiftKey) {
                        oEvent.preventDefault();
                        this.onPost({
                            getSource: () => oFeedInput,
                            getParameter: (p: string) => p === "value" ? oFeedInput.getValue() : ""
                        } as any);
                        oFeedInput.setValue("");
                    }
                }
            });
        }
    }

    /**
     * Mesaj Gönderme
     */
    public onPost(event: Event): void {
        const oInput = event.getSource() as FeedInput; 
        const sValue: string = (event as any).getParameter("value");

        if (!sValue || sValue.trim() === "") return;

        // Asistan Seçili mi kontrolü
        if (!this._sActiveAssistantID) {
            this._addMessageToUI("Sistem", "Lütfen önce soldan bir işlem seçin.", "Reply");
            return;
        }

        // UX: Kilitle
        oInput.setEnabled(false); 
        oInput.setBusy(true);

        // Mesajı Ekle
        this._addMessageToUI("Sen", sValue, "Sender");

        // OpenAI Çağır
        this._simulateBotResponse(sValue)
            .catch(err => {
                console.error(err);
                this._addMessageToUI("Sistem", "Hata: " + err.message, "Reply");
            })
            .finally(() => {
                // UX: Kilidi Aç ve Odaklan
                oInput.setBusy(false);
                oInput.setEnabled(true);
                setTimeout(() => {
                    oInput.focus();
                    const dom = oInput.getDomRef();
                    if (dom && dom.querySelector("textarea")) dom.querySelector("textarea")?.focus();
                }, 500); 
            });
    }

    // --- 🎯 SIDEBAR & ÇOKLU AJAN YÖNETİMİ ---

    /**
     * Yeni Sohbet / Temizle
     */
    public onNewChat(): void {
        const oModel = this.getView()?.getModel("chatModel") as JSONModel;
        oModel.setProperty("/CurrentSession/Messages", []); // Ekranı temizle
        this._sThreadID = null; // Thread'i sıfırla (Yeni konu başlasın)
        
        // Input'a odaklan
        setTimeout(() => {
             const oInput = this.byId("chatInput") as FeedInput;
             if(oInput) oInput.focus();
        }, 200);
    }

    /**
     * Sol Menüden Senaryo Seçimi (EN KRİTİK YER)
     */
    public onSelectPrompt(event: Event): void {
        const oCtx = (event.getSource() as Control).getBindingContext("chatModel");
        
        const sPrompt = oCtx?.getProperty("Prompt");
        const sAssistantID = oCtx?.getProperty("AssistantID"); // JSON'dan ID'yi al

        if (sPrompt && sAssistantID) {
            // 1. Asistanı Değiştir
            console.log("🧠 Beyin Değiştiriliyor... Yeni Asistan:", sAssistantID);
            this._sActiveAssistantID = sAssistantID;

            // 2. Sayfayı Temizle (Yeni bir bağlam olduğu için)
            this.onNewChat();

            // 3. Mesajı Otomatik Gönder
            const oInput = this.byId("chatInput") as FeedInput;
            oInput.setValue(sPrompt);
            
            setTimeout(() => {
                this.onPost({ 
                    getSource: () => oInput, 
                    getParameter: (p: string) => p === "value" ? sPrompt : "" 
                } as any);
                oInput.setValue("");
            }, 300);
        } else {
            // JSON'da ID eksikse uyar
            this._addMessageToUI("Sistem", "Hata: Bu senaryo için Assistant ID tanımlanmamış!", "Reply");
        }
    }

    // --- YARDIMCI FONKSİYONLAR ---

    private _addMessageToUI(sAuthor: string, sText: string, sType: "Sender" | "Reply"): void {
        const oModel = this.getView()?.getModel("chatModel") as JSONModel;
        const aMessages = oModel.getProperty("/CurrentSession/Messages") || [];

        let bHasChart = false;
        let aChartData = [];
        let sDisplayText = sText; // Ekranda görünecek yazı

        // 🕵️‍♂️ CIMBIZ OPERASYONU: Metin içinde JSON avı
        try {
            // Regex: ```json ile ``` arasındaki VEYA { ... "chart_data" ... } yapısını bul
            const jsonMatch = sText.match(/```json([\s\S]*?)```/) || sText.match(/(\{[\s\S]*"chart_data"[\s\S]*\})/);

            if (jsonMatch) {
                // Bulunan parçayı al (Match grubu 1 veya 0)
                const rawJson = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
                
                // Parse etmeye çalış
                const oData = JSON.parse(rawJson);

                if (oData.chart_data) {
                    console.log("📊 Grafik Verisi Yakalandı:", oData.chart_data);
                    
                    bHasChart = true;
                    aChartData = oData.chart_data;
                    
                    // Ekranda ham JSON kodu görünmesin, sadece botun açıklaması kalsın
                    // JSON kısmını metinden siliyoruz
                    sDisplayText = sText.replace(jsonMatch[0], "").trim();
                    
                    // Eğer bot sadece JSON attıysa ve yazı boş kaldıysa default bir şey yaz
                    if (!sDisplayText) sDisplayText = oData.summary_text || "Aktivite dağılımınız aşağıdadır.";
                }
            }
        } catch (e) {
            console.warn("JSON ayrıştırma hatası (Normal metin olabilir):", e);
        }

        aMessages.push({
            Author: sAuthor,
            AuthorPic: sType === "Sender" ? "sap-icon://employee" : "sap-icon://it-host",
            Type: sType,
            Date: new Date(),
            Text: sDisplayText,
            JobTitle: sType === "Sender" ? "SAP Danışmanı" : "GoLive Asistan",
            Status: sType === "Sender" ? "Busy" : "Active",
            StatusState: sType === "Sender" ? "Warning" : "Success",
            
            // 👇 GRAFİK VERİLERİ
            HasChart: bHasChart,
            ChartData: aChartData,
            
            // 👇 YENİ: GRAFİK AYARLARI (XML Hatasını Çözen Kısım)
            ChartProperties: {
                title: {
                    text: "Proje Efor Dağılımı",
                    visible: true
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        showTotal: true
                    }
                },
                legend: {
                    visible: true
                }
            }
        });

        oModel.refresh(true);
        this._scrollToBottom();
    }

    private _scrollToBottom(): void {
        const oScrollContainer = this.byId("chatScroll") as ScrollContainer;
        if (oScrollContainer) {
            setTimeout(() => {
                const oDomRef = oScrollContainer.getDomRef();
                if (oDomRef) oDomRef.scrollTop = oDomRef.scrollHeight;
            }, 100);
        }
    }

    // --- OPENAI MANTIĞI ---

    private async _simulateBotResponse(sUserText: string): Promise<void> {
        try {
            // A. Thread Kontrolü
            if (!this._sThreadID) {
                const t = await this._callOpenAI("POST", "/threads", {});
                this._sThreadID = t.id;
            }

            // B. Mesaj Gönder
            await this._callOpenAI("POST", `/threads/${this._sThreadID}/messages`, {
                role: "user", content: sUserText
            });

            // C. Çalıştır (Run) - BURASI ARTIK DİNAMİK (Seçili Asistan ID)
            const oRun = await this._callOpenAI("POST", `/threads/${this._sThreadID}/runs`, {
                assistant_id: this._sActiveAssistantID // 👈 KRİTİK NOKTA
            });

            // D. Bekle
            await this._pollRunStatus(oRun.id);

        } catch (error) {
            throw error;
        }
    }

    private async _pollRunStatus(sRunId: string): Promise<void> {
        let sStatus = "queued";
        while (sStatus !== "completed") {
            await new Promise(r => setTimeout(r, 1000));
            const oRun = await this._callOpenAI("GET", `/threads/${this._sThreadID}/runs/${sRunId}`);
            sStatus = oRun.status;

            if (sStatus === "failed" || sStatus === "cancelled") throw new Error("Asistan yanıt veremedi.");

            if (sStatus === "requires_action") {
                const oToolCalls = oRun.required_action.submit_tool_outputs.tool_calls;
                const aToolOutputs = [];

                for (const toolCall of oToolCalls) {
                    const result = await this._executeFunction(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                    aToolOutputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(result)
                    });
                }
                await this._callOpenAI("POST", `/threads/${this._sThreadID}/runs/${sRunId}/submit_tool_outputs`, {
                    tool_outputs: aToolOutputs
                });
            }
        }

        if (sStatus === "completed") {
            const msgs = await this._callOpenAI("GET", `/threads/${this._sThreadID}/messages`);
            const sReply = msgs.data[0].content[0].text.value;
            // Bot adını asistana göre özelleştirebilirsin, şimdilik "GoLive Asistan" kalsın
            this._addMessageToUI("GoLive Asistan", sReply, "Reply");
        }
    }

    // --- 🛠️ MOCK TOOLS (FONKSİYONLAR) ---
    // Burası Asistanın "Elini Kolunu" oluşturur.

    private async _executeFunction(sFunctionName: string, oArgs: any): Promise<any> {
        console.log(`🤖 Tool Çağrıldı: ${sFunctionName}`, oArgs);

        try {
            // ==========================================
            // 1. AKTİVİTE ASİSTANI (Firma ve Kayıt)
            // ==========================================
            if (sFunctionName === "get_companies") {
                const sSearchText = oArgs.search_text || "";
                const response = await fetch(`/api/companies?search=${sSearchText}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                return { companies: data.companies, count: data.companies ? data.companies.length : 0 };
            } 
            
            else if (sFunctionName === "save_activity") {
                const response = await fetch(`/api/activities`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify({
                        companyId: oArgs.company_id,
                        hours: oArgs.hours,
                        description: oArgs.description,
                        date: oArgs.date
                    })
                });
                const data = await response.json();
                return data; 
            }

            // ==========================================
            // 2. PLANLAMA ASİSTANI (Plan Oluşturma)
            // ==========================================
            else if (sFunctionName === "create_plan") {
                const response = await fetch(`/api/plans`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify({
                        projectName: oArgs.project_name, // Backend şemasına uygun alan adları
                        hours: oArgs.hours,
                        date: oArgs.date
                    })
                });
                const data = await response.json();
                return data; // { status: "success", plan_id: "..." }
            }
            
            else if (sFunctionName === "check_availability") {
                // Backend'de buna özel bir endpoint yazmadık, 
                // şimdilik basit bir kontrol (Mock) olarak Frontend'de halledelim.
                // Gerçek hayatta burası da fetch('/api/availability') olurdu.
                console.log("Müsaitlik kontrol ediliyor...");
                return { 
                    available: true, 
                    message: "Belirtilen tarihte 8 saatlik kapasiteniz var." 
                };
            }

            // ==========================================
            // 3. RAPORLAMA ASİSTANI (Grafik ve Veri)
            // ==========================================
            else if (sFunctionName === "get_activity_report") {
                // Backend server.js dosyasında /api/reports endpoint'i hazır.
                const response = await fetch(`/api/reports`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                // Backend zaten { summary_text: "...", chart_data: [...] } dönüyor
                return data; 
            }

            return { error: "Bilinmeyen fonksiyon: " + sFunctionName };

        } catch (error) {
            console.error("Backend Hatası:", error);
            return { error: "Sunucuya ulaşılamadı. Lütfen backend bağlantısını kontrol edin." };
        }
    }

    private async _callOpenAI(method: string, endpoint: string, body?: any): Promise<any> {
        const response = await fetch("https://api.openai.com/v1" + endpoint, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this._sOpenAIKey}`,
                "OpenAI-Beta": "assistants=v2"
            },
            body: body ? JSON.stringify(body) : null
        });
        return await response.json();
    }

    // --- UI EVENT HANDLERS ---

    public onSearch(event: Event): void {
        const sQuery = (event as any).getParameter("newValue");
        const aFilters: Filter[] = [];
        if (sQuery && sQuery.length > 0) {
            aFilters.push(new Filter("Text", FilterOperator.Contains, sQuery));
        }
        const oList = this.byId("chatList") as List;
        const oBinding = oList.getBinding("items") as ListBinding;
        if (oBinding) oBinding.filter(aFilters);
    }
    
    // Eski onClearChat fonksiyonuna gerek kalmadı, onNewChat kullanıyoruz.
    // ama Search alanındaki sil butonuna bağlıysa diye alias olarak bırakabilirsin:
    public onClearChat(): void {
        this.onNewChat();
    }

    public onIconPress(event: Event): void {
        const oSource = event.getSource() as Control;
        const oView = this.getView();
        if (!this._oPopover) {
            this._oPopover = Fragment.load({
                id: oView?.getId(),
                name: "com.mycompany.ui5chatapp.view.UserPopover",
                controller: this
            }).then((oPopover: any) => {
                oView?.addDependent(oPopover);
                return oPopover;
            });
        }
        this._oPopover.then((oPopover) => {
            oPopover.bindElement({
                path: oSource.getBindingContext("chatModel")?.getPath() || "",
                model: "chatModel"
            });
            oPopover.openBy(oSource);
        });
    }

    public onClosePopover(): void {
        if (this._oPopover) this._oPopover.then((oPopover) => oPopover.close());
    }

    /**
     * Sol Paneli Aç/Kapat (Toggle Sidebar)
     */
    public onToggleSidebar(): void {
        // ID ile VBox'ı bul (Control tipine cast ediyoruz ki özellikleri gelsin)
        const oSidebar = this.byId("sidebarBox") as Control;
        
        if (oSidebar) {
            // Görünürlük durumunu tersine çevir (True -> False / False -> True)
            const bState = oSidebar.getVisible();
            oSidebar.setVisible(!bState);
        }
    }

    // --- 💾 SOHBET KAYIT VE YÜKLEME İŞLEMLERİ ---

    /**
     * Geçmiş Sohbetleri Backend'den Çek
     */
    public async loadChatHistory(): Promise<void> {
        try {
            const response = await fetch("/api/chats", { method: "GET", credentials: 'include' });
            const data = await response.json();
            
            const oModel = this.getView()?.getModel("chatModel") as JSONModel;
            oModel.setProperty("/ChatHistory", data.chats); // Listeye bağla
        } catch (error) {
            console.error("Geçmiş yüklenemedi:", error);
        }
    }

    /**
     * Mevcut Sohbeti Veritabanına Kaydet
     */
    public async onSaveChat(): Promise<void> {
        const oModel = this.getView()?.getModel("chatModel") as JSONModel;
        const aMessages = oModel.getProperty("/CurrentSession/Messages");

        if (!aMessages || aMessages.length === 0) {
            this._addMessageToUI("Sistem", "Kaydedilecek mesaj yok kral.", "Reply");
            return;
        }

        // Başlık oluştur (İlk mesajın özeti veya Tarih)
        const sFirstMsg = aMessages[0].Text.substring(0, 20) + "...";
        const sTitle = `Sohbet: ${sFirstMsg}`;

        try {
            const response = await fetch("/api/chats", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: sTitle,
                    assistantId: this._sActiveAssistantID || this._sDefaultAssistantID,
                    messages: aMessages
                })
            });

            const result = await response.json();
            if (result.status === "success") {
                this._addMessageToUI("Sistem", "✅ Sohbet başarıyla arşivlendi.", "Reply");
                this.loadChatHistory(); // Listeyi güncelle
            }
        } catch (error) {
            this._addMessageToUI("Sistem", "❌ Kayıt hatası oluştu.", "Reply");
        }
    }

    /**
     * Geçmişten Bir Sohbet Seçilince
     */
    public onSelectHistory(event: Event): void {
        const oCtx = (event.getSource() as Control).getBindingContext("chatModel");
        
        // 👇 DÜZELTME BURADA: 'as any' ekledik
        // TypeScript'e diyoruz ki: "Bunu herhangi bir obje olarak kabul et, içini ben biliyorum."
        const oSelectedChat = oCtx?.getObject() as any;

        if (oSelectedChat) {
            const oModel = this.getView()?.getModel("chatModel") as JSONModel;
            
            // 1. Ekrana Yükle
            // Artık kızmaz çünkü 'any' dedik
            oModel.setProperty("/CurrentSession/Messages", oSelectedChat.messages);
            
            // 2. Asistanı Ayarla (Kaldığımız yerden devam edebilmek için)
            this._sActiveAssistantID = oSelectedChat.assistantId;
            this._sThreadID = null; // Eski thread ID'si geçersiz olabilir, sıfırlıyoruz.
            
            // 3. Mobil menüyü kapat (İsteğe bağlı)
            const oSidebar = this.byId("sidebarBox") as Control;
            // if(oSidebar) oSidebar.setVisible(false);
            
            this._scrollToBottom();
        }
    }

    /**
     * Geçmişten Sohbet Silme (X Butonu)
     */
    public async onDeleteHistoryItem(event: Event): Promise<void> {
        // 1. Silinecek satırı bul
        const oList = event.getSource() as List;
        const oItem = (event as any).getParameter("listItem"); // Silinen satır
        const oCtx = oItem.getBindingContext("chatModel");
        const oChat = oCtx.getObject(); // Sohbet verisi
        
        // MongoDB'deki ID'si (_id)
        const sChatId = oChat._id; 

        if (!sChatId) return;

        try {
            // 2. Backend'e DELETE isteği at
            const response = await fetch(`/api/chats/${sChatId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.status === "success") {
                // 3. Başarılıysa listeyi hemen güncelle (Satırı ekrandan sil)
                // (Backend'den tekrar çekmek en temizidir)
                this.loadChatHistory();
                
                // Eğer silinen sohbet şu an ekranda açıksa, ekranı da temizle
                /* Opsiyonel:
                const oModel = this.getView()?.getModel("chatModel") as JSONModel;
                const currentMsgs = oModel.getProperty("/CurrentSession/Messages");
                if (currentMsgs === oChat.messages) {
                    this.onNewChat();
                }
                */
            } else {
                this._addMessageToUI("Sistem", "Silme işlemi başarısız oldu.", "Reply");
            }
        } catch (error) {
            console.error("Silme hatası:", error);
        }
    }

    // --- 🎙️ SESLİ KOMUT (Web Speech API) ---
    public onMicPress(event: Event): void {
        const oButton = event.getSource() as Control; // Mikrofon butonu
        const oInput = this.byId("chatInput") as FeedInput;
        
        // 1. Tarayıcı Desteği Kontrolü
        if (!('webkitSpeechRecognition' in window)) {
            this._addMessageToUI("Sistem", "Tarayıcınız sesli komutu desteklemiyor (Chrome veya Edge kullanın).", "Reply");
            return;
        }

        // 2. Tanıma Motorunu Başlat
        // (window as any) yaparak TypeScript'in "Bu ne?" demesini engelliyoruz
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Ayarlar
        recognition.lang = "tr-TR";     // Türkçe anlasın
        recognition.continuous = false;   // Tek cümle alıp dursun
        recognition.interimResults = false; // Sadece bitmiş cümleyi ver

        // --- OLAYLAR (Events) ---

        // A. Başladığında: Butonu Kırmızı Yap (Kayıt Modu)
        recognition.onstart = () => {
            if (oButton.getMetadata().getName() === "sap.m.Button") {
                (oButton as any).setType("Reject"); // Kırmızı renk (Reject)
            }
            oInput.setPlaceholder("Dinliyorum... 🎙️");
        };

        // B. Bittiğinde: Butonu Normale Döndür
        recognition.onend = () => {
            if (oButton.getMetadata().getName() === "sap.m.Button") {
                (oButton as any).setType("Transparent");
            }
            oInput.setPlaceholder("Mesajını yaz kral... (Enter ile gönder)");
        };

        // C. Sonuç Geldiğinde: Yazıyı Kutuya Bas
        recognition.onresult = (event: any) => {
            const sTranscript = event.results[0][0].transcript;
            console.log("Ses Algılandı:", sTranscript);
            
            // Yazıyı kutuya koy (Direkt göndermiyoruz, kullanıcı görüp onaylasın)
            oInput.setValue(sTranscript);
            
            // Eğer "Direkt Göndersin" istersen şu satırı açabilirsin:
            // this.onPost({ getSource: () => oInput, getParameter: (p:string) => p==="value" ? sTranscript : "" } as any);
        };
        
        // D. Hata Olursa
        recognition.onerror = (event: any) => {
            console.error("Ses Hatası:", event.error);
            // Sessizce kapansın
        };

        // Motoru Ateşle
        recognition.start();
    }

}
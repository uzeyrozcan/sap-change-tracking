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
 * @namespace aiassistant.controller.aiassistant
 */
export default class aiassistant extends Controller {

    // ✅ GÜVENLİK: OpenAI API key backend'de yönetilecek (service.js)
    // Client'tan kaldırıldı - ask() action'ı backend'de OpenAI'ı çağırıyor
    
    // Aktif Asistan ve Thread Yönetimi (Backend'de yönetilecek)
    private _sActiveAssistantID: string | null = null;
    private _sThreadID: string | null = null;
    
    // Varsayılan Asistan ID (Backend'de kullanılacak)
    private _sDefaultAssistantID: string = "asst_yc4XTlGZm6Y1IFU9bUJLy85O"; 

    private _oPopover: Promise<ResponsivePopover> | null = null;
    public formatter = formatter;
    private _sBackendURL: string = "";

    public onInit(): void {
        const oData = {
            chatModel: {
                // CurrentSession geçici state için kullanılacak
            },
            CurrentSession: {
                Messages: [],
                ThreadID: null
            }
        };
        const oModel = new JSONModel(oData);
        this.getView()?.setModel(oModel, "chatModel");

        // OData'dan Prompts'u çekmeye gerek yok - direkt binding yapılacak
        // View'da: items="{path: '/Prompts', parameters: { $orderby: 'sortOrder' }}"

        // Varsayılan asistanı ayarla
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
     * Sol Menüden Senaryo Seçimi (OData Prompts kullanarak)
     */
    public onSelectPrompt(event: Event): void {
        const oCtx = (event.getSource() as Control).getBindingContext(); // OData context
        
        const sPrompt = oCtx?.getProperty("prompt");
        const sAssistantID = oCtx?.getProperty("assistantID");

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
            console.error("Prompt veya AssistantID eksik!");
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

    // --- 🎯 CAP OData ACTION YÖNTEMİ (OpenAI Backend'de) ---

    private async _simulateBotResponse(sUserText: string): Promise<void> {
        try {
            // CAP ask action'ını çağır - Backend OpenAI'yi yönetiyor
            const oModel = this.getView()?.getModel() as any;
            const oBinding = oModel.bindContext("/ask(...)");
            
            // Session ID oluştur veya mevcut thread'i kullan
            if (!this._sThreadID) {
                this._sThreadID = this._generateUUID();
            }
            
            oBinding.setParameter("question", sUserText);
            oBinding.setParameter("sessionId", this._sThreadID);
            
            await oBinding.execute();
            const result = oBinding.getBoundContext().getObject();
            
            // Backend'den gelen cevabı UI'ye ekle
            this._addMessageToUI("GoLive Asistan", result.answer, "Reply");
            
        } catch (error: any) {
            console.error("CAP ask action hatası:", error);
            throw new Error("Backend iletişim hatası: " + (error.message || "Bilinmiyor"));
        }
    }

    private _generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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
                // CAP OData sorgusu ile Companies entity'den veri çek
                const sSearchText = oArgs.search_text || "";
                const oModel = this.getView()?.getModel() as any;
                
                // $filter ile arama (name, sector, city üzerinde)
                let sFilter = "";
                if (sSearchText) {
                    sFilter = `?$filter=contains(name,'${sSearchText}') or contains(sector,'${sSearchText}') or contains(city,'${sSearchText}')&$top=10`;
                } else {
                    sFilter = "?$top=10";
                }
                
                const response = await fetch(`/service/FiorielementsService/Companies${sFilter}`, {
                    credentials: 'include'
                });
                const data = await response.json();
                return { companies: data.value || [], count: data.value?.length || 0 };
            } 
            
            else if (sFunctionName === "save_activity") {
                // CAP createActivity action çağrısı
                const oModel = this.getView()?.getModel() as any;
                const oBinding = oModel.bindContext("/createActivity(...)");
                
                oBinding.setParameter("companyId", oArgs.company_id);
                oBinding.setParameter("hours", oArgs.hours);
                oBinding.setParameter("description", oArgs.description);
                oBinding.setParameter("date", oArgs.date);
                
                await oBinding.execute();
                const result = oBinding.getBoundContext().getObject();
                
                return { status: "success", activity_id: result.ID }; 
            }

            // ==========================================
            // 2. PLANLAMA ASİSTANI (Plan Oluşturma)
            // ==========================================
            else if (sFunctionName === "create_plan") {
                // CAP createPlan action çağrısı
                const oModel = this.getView()?.getModel() as any;
                const oBinding = oModel.bindContext("/createPlan(...)");
                
                oBinding.setParameter("projectName", oArgs.project_name);
                oBinding.setParameter("hours", oArgs.hours);
                oBinding.setParameter("date", oArgs.date);
                
                await oBinding.execute();
                const result = oBinding.getBoundContext().getObject();
                
                return { status: "success", plan_id: result.ID };
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
                // CAP getActivityReport action çağrısı
                const oModel = this.getView()?.getModel() as any;
                const oBinding = oModel.bindContext("/getActivityReport(...)");
                
                await oBinding.execute();
                const data = oBinding.getBoundContext().getObject();
                // Backend { summary_text: "...", chart_data: [...] } dönüyor
                return data; 
            }

            return { error: "Bilinmeyen fonksiyon: " + sFunctionName };

        } catch (error) {
            console.error("Backend Hatası:", error);
            return { error: "Sunucuya ulaşılamadı. Lütfen backend bağlantısını kontrol edin." };
        }
    }

    // ⚠️ DEPRECATION: _callOpenAI kaldırıldı
    // OpenAI çağrıları artık backend'de (service.js ask action) yönetiliyor
    // Client'tan direkt OpenAI API'ye çağrı yapılmamalı (güvenlik riski)

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
     * ⚠️ DEPRECATION: loadChatHistory artık gerekli değil
     * OData binding direkt ChatSessions'a bağlı (/ChatSessions)
     */
    public async loadChatHistory(): Promise<void> {
        // View'da zaten OData binding var: items="{path: '/ChatSessions', ...}"
        // Ancak manuel yenilemek isterseniz:
        const oModel = this.getView()?.getModel() as any;
        if (oModel && oModel.refresh) {
            oModel.refresh();
        }
    }

    /**
     * Geçmişten Sohbet Seç (OData Context kullanarak)
     */
    public onSelectHistory(oEvent: any): void {
        const oItem = oEvent.getSource();
        const oCtx = oItem.getBindingContext();
        const sSelectedId = oCtx?.getProperty("ID");

        if (sSelectedId) {
            // Session ID'yi saklayalım
            this._sThreadID = sSelectedId;
            
            // Chat listesini bu session'a filtrele
            const oList = this.byId("chatList") as List;
            if (oList) {
                const oBinding = oList.getBinding("items") as ListBinding;
                if (oBinding) {
                    const oFilter = new Filter("session_ID", FilterOperator.EQ, sSelectedId);
                    oBinding.filter(oFilter);
                }
            }
        }
    }

    /**
     * Geçmiş Kaydı Sil (OData Delete)
     */
    public async onDeleteHistoryItem(oEvent: any): Promise<void> {
        const oItem = oEvent.getParameter("listItem");
        const oCtx = oItem.getBindingContext();
        
        if (oCtx) {
            try {
                await oCtx.delete();
                console.log("✅ Sohbet silindi");
                
                // Eğer silinen mevcut sohbetse, temizle
                const sDeletedId = oCtx.getProperty("ID");
                if (this._sThreadID === sDeletedId) {
                    this.onNewChat();
                }
            } catch (error: any) {
                console.error("Silme hatası:", error);
            }
        }
    }

    /**
     * Mevcut Sohbeti Veritabanına Kaydet
     * ⚠️ NOT: ChatMessages zaten OData ile kaydediliyor
     * Bu fonksiyon artık opsiyonel - manuel snapshot almak için kullanılabilir
     */
    public async onSaveChat(): Promise<void> {
        // OData binding kullanıyorsanız mesajlar zaten kaydediliyor
        // Ancak manuel bir "snapshot" almak isterseniz:
        
        if (!this._sThreadID) {
            console.warn("Session ID yok, kayıt yapılamıyor");
            return;
        }

        try {
            // Session'ın title'ını güncelle (opsiyonel)
            const oModel = this.getView()?.getModel() as any;
            const oBinding = oModel.bindContext(`/ChatSessions(${this._sThreadID})`);
            await oBinding.requestObject();
            
            console.log("✅ Sohbet kaydedildi (zaten OData'da)");
            
        } catch (error) {
            console.error("Kayıt hatası:", error);
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
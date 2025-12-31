import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import formatter from "../model/formatter";
import List from "sap/m/List";
import ListBinding from "sap/ui/model/ListBinding";
import Fragment from "sap/ui/core/Fragment";
import Control from "sap/ui/core/Control";
import MessageBox from "sap/m/MessageBox";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Context from "sap/ui/model/odata/v4/Context";

/**
 * @namespace aiassistant2.controller
 */
export default class aiassistant2 extends Controller {
    
    public formatter = formatter;
    private _pPopover: Promise<any> | null = null; // Popover için değişken

    public onInit(): void {
        const oViewModel = new JSONModel({
            busy: false,
            currentSessionId: null
        });
        this.getView()?.setModel(oViewModel, "view");

        // Prompt Modeli
        const oPromptsModel = new JSONModel({
            items: [
                { title: "S/4HANA Nedir?", desc: "Temel özellikleri nelerdir?" },
                { title: "CAP Mimarisi", desc: "srv ve db klasörleri ne işe yarar?" },
                { title: "Fiori Elements", desc: "List Report nasıl yapılır?" }
            ]
        });
        this.getView()?.setModel(oPromptsModel, "prompts");

        this.onNewChat();
        
        // ENTER TUŞU DESTEĞİ
        this._attachEnterKey();
    }

    public onNewChat(): void {
        const newId = this._generateUUID();
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        oViewModel.setProperty("/currentSessionId", newId);
        this._filterList(newId);
        MessageToast.show("Yeni sohbet açıldı.");
    }

    // --- GEÇMİŞ LİSTESİ SEÇİMİ (DÜZELTİLDİ) ---
    // --- GEÇMİŞ SEÇİMİ (GÜNCELLENDİ) ---
    public onSelectHistory(oEvent: any): void {
        // DÜZELTME: 'press' eventi kullandığımız için
        // getParameter("listItem") yerine getSource() kullanıyoruz.
        // Çünkü olayı tetikleyen şey direkt satırın kendisi.
        
        const oItem = oEvent.getSource(); // Tıklanan satır
        const oCtx = oItem.getBindingContext();
        const sSelectedId = oCtx.getProperty("ID");

        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        oViewModel.setProperty("/currentSessionId", sSelectedId);
        
        this._filterList(sSelectedId);
        this._scrollToBottom();
        
        // Mobildeysek menüyü kapatabilirsin
        // this.onToggleSidebar(); 
    }

    public async onPostMessage(oEvent: any): Promise<void> {
        let sValue = "";
        if (typeof oEvent === "string") {
            sValue = oEvent;
        } else if (oEvent.getParameter) {
            sValue = oEvent.getParameter("value");
        }

        if (!sValue || sValue.trim() === "") return;

        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const sSessionId = oViewModel.getProperty("/currentSessionId");

        oViewModel.setProperty("/busy", true);

        try {
            const oModel = this.getView()?.getModel() as any; 
            const oOp: any = oModel.bindContext("/ask(...)");
            
            oOp.setParameter("question", sValue);
            oOp.setParameter("sessionId", sSessionId);

            await oOp.execute();

            this._refreshLists();
            this._scrollToBottom();

        } catch (e: any) {
            MessageToast.show("Hata: " + (e.message || "Bilinmeyen hata"));
        } finally {
            oViewModel.setProperty("/busy", false);
        }
    }

    // --- POPOVER (PROFIL KARTI) ---
    public onIconPress(oEvent: any): void {
        const oSource = oEvent.getSource();
        const oView = this.getView();

        if (!this._pPopover) {
            this._pPopover = Fragment.load({
                id: oView?.getId(),
                name: "aiassistant2.view.UserPopover", // Dosya yolunun doğru olduğundan emin ol
                controller: this
            }).then((oPopover: any) => {
                oView?.addDependent(oPopover);
                return oPopover;
            });
        }

        this._pPopover.then((oPopover) => {
            const oBindingContext = oSource.getBindingContext();
            oPopover.setBindingContext(oBindingContext);
            oPopover.openBy(oSource);
        });
    }

    public onClosePopover(): void {
        if (this._pPopover) {
            this._pPopover.then((oPopover) => oPopover.close());
        }
    }

    // --- YARDIMCILAR ---

    public onSelectPrompt(oEvent: any): void {
        const oCtx = oEvent.getSource().getBindingContext("prompts");
        const sDesc = oCtx.getProperty("description");
        this.onNewChat();
        setTimeout(() => {
        this.onPostMessage(sDesc);
        // EKLE: Mesaj post edildikten sonra kaydır
        this._scrollToBottom();
    }, 300);
    }

    private _filterList(sId: string): void {
        const oList = this.byId("chatList") as List;
        if (!oList) return;

        const oBinding = oList.getBinding("items") as ListBinding;
        if (oBinding) {
            const oFilter = new Filter("session_ID", FilterOperator.EQ, sId);
            const oSorter = new Sorter("timestamp", false);
            oBinding.filter(oFilter);
            oBinding.sort(oSorter);
        }
    }

    private _refreshLists(): void {
        const oChatList = this.byId("chatList") as List;
        const oHistoryList = this.byId("historyList") as List;
        if (oChatList) (oChatList.getBinding("items") as ListBinding).refresh();
        if (oHistoryList) (oHistoryList.getBinding("items") as ListBinding)?.refresh();
    }

    private _generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private _attachEnterKey(): void {
        const oFeedInput = this.byId("chatInput");
        if (oFeedInput) {
            oFeedInput.addEventDelegate({
                onsapenter: (oEvent: any) => {
                    // Shift'e basılmadıysa gönder
                    if (!oEvent.shiftKey) {
                        oEvent.preventDefault(); // Yeni satıra geçmeyi engelle
                        const sVal = (oFeedInput as any).getValue();
                        this.onPostMessage(sVal);
                        (oFeedInput as any).setValue("");
                    }
                }
            });
        }
    }

    // --- SİLME İŞLEMİ (YENİ) ---
    public async onDeleteHistory(oEvent: any): Promise<void> {
        // 1. Silinecek satırın bağlamını (Context) al
        const oItem = oEvent.getParameter("listItem");
        const oCtx = oItem.getBindingContext();
        
        // 2. Silinen Sohbetin ID'sini al (Kontrol için)
        const sDeletedId = oCtx.getProperty("ID");

        try {
            await oCtx.delete();
            
            MessageToast.show("Sohbet silindi.");

            const oViewModel = this.getView()?.getModel("view") as JSONModel;
            const sCurrentId = oViewModel.getProperty("/currentSessionId");

            if (sDeletedId === sCurrentId) {
                this.onNewChat(); // Ekranı temizle
            }

        } catch (error: any) {
            MessageToast.show("Silme hatası: " + (error.message || "Bilinmiyor"));
        }
    }

    private _scrollToBottom(): void {
    const oScrollContainer = this.byId("chatScroll") as any;
    if (oScrollContainer) {
        // Gecikmeyi biraz artırıyoruz (400ms) ki DOM tam otursun
        setTimeout(() => {
            // verticalScrollPosition ile en aşağı itiyoruz
            const oDomRef = oScrollContainer.getDomRef();
            if (oDomRef) {
                oScrollContainer.scrollTo(0, 5000, 500); // 5000px aşağı it (zaten max'ta durur)
            }
        }, 400);
    }
    }

    public onToggleSidebar(): void {
        const oSidebar = this.byId("sidebarBox") as Control;
        
        if (oSidebar.hasStyleClass("sidebar-expanded")) {
            oSidebar.removeStyleClass("sidebar-expanded");
            oSidebar.addStyleClass("sidebar-collapsed");
        } else {
            oSidebar.removeStyleClass("sidebar-collapsed");
            oSidebar.addStyleClass("sidebar-expanded");
        }
    }

    public onSearch(oEvent: any): void {
        const sQuery = oEvent.getParameter("newValue");
        const oList = this.byId("chatList");
        const oBinding = oList.getBinding("items") as any;

        if (sQuery && sQuery.length > 0) {
            // 'content' alanı içinde arama yap (Backend alan adın farklıysa düzelt)
            const oFilter = new sap.ui.model.Filter("content", sap.ui.model.FilterOperator.Contains, sQuery);
            oBinding.filter([oFilter]);
        } else {
            oBinding.filter([]);
        }
    }

    public onClearChat(): void {
        const oList = this.byId("chatList") as sap.m.List;
        const oBinding = oList.getBinding("items") as ODataListBinding;
        const aContexts = oBinding.getContexts();

        if (aContexts.length === 0) {
            MessageToast.show("Zaten temizlenecek bir mesaj yok.");
            return;
        }

        MessageBox.confirm("Tüm sohbet geçmişi kalıcı olarak silinecek. Emin misiniz?", {
            title: "Sohbeti Temizle",
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: async (sAction: string) => {
                if (sAction === MessageBox.Action.OK) {
                    try {
                        // Ekranı dondur (Busy)
                        this.getView()?.getModel("view")?.setProperty("/busy", true);

                        // Tüm mesajları backend'den sil
                        const aDeletePromises = aContexts.map((oContext: Context) => oContext.delete());
                        await Promise.all(aDeletePromises);

                        MessageToast.show("Sohbet başarıyla temizlendi.");
                    } catch (oError: any) {
                        MessageBox.error("Mesajlar silinirken bir hata oluştu: " + oError.message);
                    } finally {
                        this.getView()?.getModel("view")?.setProperty("/busy", false);
                    }
                }
            }
        });
    }

    public onSaveChat(): void {
        const oView = this.getView();
        // Mevcut session ID'sini al (Context üzerinden)
        const oSessionContext = oView?.getBindingContext() as Context;

        if (!oSessionContext) {
            MessageToast.show("Kaydedilecek aktif bir sohbet bulunamadı.");
            return;
        }

        // Kullanıcıdan bir başlık iste
        MessageBox.show("Sohbeti hangi isimle kaydetmek istersiniz?", {
            icon: MessageBox.Icon.QUESTION,
            title: "Sohbeti Kaydet",
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            content: new sap.m.Input({
                id: "newChatTitle",
                placeholder: "Sohbet başlığı...",
                value: oSessionContext.getProperty("title") || ""
            }),
            onClose: async (sAction: string) => {
                if (sAction === MessageBox.Action.OK) {
                    const sNewTitle = (sap.ui.getCore().byId("newChatTitle") as sap.m.Input).getValue();
                    
                    if (!sNewTitle) {
                        MessageToast.show("Geçerli bir başlık girmelisiniz.");
                        return;
                    }

                    try {
                        // OData V4 üzerinden 'title' alanını güncelle
                        await oSessionContext.setProperty("title", sNewTitle);
                        MessageToast.show("Sohbet '" + sNewTitle + "' olarak kaydedildi.");
                        
                        // Soldaki geçmiş listesini tazele
                        const oHistoryList = this.byId("historyList") as sap.m.List;
                        (oHistoryList.getBinding("items") as ODataListBinding).refresh();
                        
                    } catch (oError: any) {
                        MessageBox.error("Güncelleme başarısız: " + oError.message);
                    }
                }
            }
        });
    }


}
import DateFormat from "sap/ui/core/format/DateFormat";

export default {
    /**
     * Tarih Formatlayıcı
     */
    formatMessageDate: function (date: Date | string): string {
        if (!date) return "";
        const oDate = date instanceof Date ? date : new Date(date);
        const oNow = new Date();
        const oDateFormat = DateFormat.getTimeInstance({ pattern: "HH:mm" });
        if (oDate.toDateString() === oNow.toDateString()) {
            return oDateFormat.format(oDate);
        } 
        return DateFormat.getDateInstance({ style: "medium" }).format(oDate);
    },

    /**
     * Markdown -> HTML Dönüştürücü
     * OpenAI'ın **kalın** ve - listelerini HTML'e çevirir.
     */
    formatRichText: function (sText: string): string {
        if (!sText) return "";
        let sHtml = sText;
        sHtml = sHtml.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        sHtml = sHtml.replace(/\n/g, "<br>");
        return sHtml;
    },

    /**
     * Role'e göre ikon döndür (CAP için)
     */
    getRoleIcon: function (sRole: string): string {
        return sRole === "user" ? "sap-icon://employee" : "sap-icon://it-host";
    },

    /**
     * Role'e göre isim döndür (CAP için)
     */
    getRoleName: function (sRole: string): string {
        return sRole === "user" ? "Sen" : "GoLive Asistan";
    },

    /**
     * Mesaj stili (CAP aiassistant2 için)
     */
    getMessageStyle: function (sRole: string): string {
        return sRole === "user" ? "senderBubble" : "receiverBubble";
    },

    /**
     * Avatar ikonu (aiassistant2 için)
     */
    getIcon: function (sRole: string): string {
        return sRole === "user" ? "sap-icon://employee" : "sap-icon://robot";
    },

    /**
     * Kullanıcı ismi (aiassistant2 için)
     */
    getName: function (sRole: string): string {
        return sRole === "user" ? "" : "AI Asistan";
    }
};
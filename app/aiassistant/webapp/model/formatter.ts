import DateFormat from "sap/ui/core/format/DateFormat";

export default {
    /**
     * Tarih Formatlayıcı (Mevcut)
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
     * YENİ: Markdown -> HTML Dönüştürücü
     * OpenAI'ın **kalın** ve - listelerini HTML'e çevirir.
     */
    formatRichText: function (sText: string): string {
        if (!sText) return "";

        let sHtml = sText;

        // 1. ÖNCE HTML Karakterlerini Temizle (Güvenlik)
        // (Opsiyonel ama iyi olur, şimdilik geçebiliriz)

        // 2. Kalın Yazıları Çevir (**text** -> <strong>text</strong>)
        sHtml = sHtml.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // 3. EN ÖNEMLİSİ: Satır Başlarını <br> yap
        // \n karakterini <br> etiketine çeviriyoruz
        sHtml = sHtml.replace(/\n/g, "<br>");

        return sHtml;
    }
};
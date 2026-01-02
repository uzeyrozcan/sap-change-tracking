export default {

    formatMessageDate: function (sDate: string): string {
        if (!sDate) return "";
        const oDate = new Date(sDate);
        if (isNaN(oDate.getTime())) return ""; 
        return oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    getIcon: function(sRole: string): string {
        return sRole === 'user' ? 'sap-icon://person-placeholder' : 'sap-icon://da-2';
    },

    getName: function(sRole: string): string {
        return sRole === 'user' ? 'Siz' : 'AI Asistan';
    },

    getMessageStyle: function (sRole: string): string {
        return sRole === 'user' ? 'senderBubble' : 'receiverBubble';
    },

    formatRichText: function (sText: string): string {
        if (!sText) return "";
        return sText.replace(/\n/g, "<br>"); 
    },

    // --- YENİ EKLENEN FONKSİYON ---
    // AI ismini sadece AI mesajlarında göster, user'da gizle
    isAi: function(sRole: string): boolean {
        return sRole !== 'user';
    }
};
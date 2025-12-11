
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageToast"], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("chat.controller.chat", {
    onInit: function () {
      const oModel = new sap.ui.model.json.JSONModel({ messages: [] });
      this.getView().setModel(oModel);
    },

    onSend: async function () {
      const input = this.byId("inputMsg");
      const chatList = this.byId("chatList");
      const message = input.getValue().trim();

      if (!message) return MessageToast.show("Lütfen bir mesaj girin.");

      const oModel = this.getView().getModel();
      const msgs = oModel.getProperty("/messages");
      msgs.push({ sender: "👤 Siz", message, from: "user" });
      oModel.setProperty("/messages", msgs);
      input.setValue("");

      try {
        const res = await fetch("/service/FiorielementsService/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: message }),
        });

        const data = await res.json();
        msgs.push({ sender: "🤖 Asistan", message: data.answer, from: "bot" });

      } catch (err) {
        msgs.push({ sender: "⚠️ Sistem", message: "Hata: " + err.message, from: "system" });
      }

      oModel.setProperty("/messages", msgs);
      chatList.scrollToIndex(msgs.length - 1);
    },
  });
});

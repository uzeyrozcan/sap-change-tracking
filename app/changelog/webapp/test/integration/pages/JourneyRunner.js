sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"changelog/test/integration/pages/ChangeLogList",
	"changelog/test/integration/pages/ChangeLogObjectPage",
	"changelog/test/integration/pages/ChangeLogChangesObjectPage"
], function (JourneyRunner, ChangeLogList, ChangeLogObjectPage, ChangeLogChangesObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('changelog') + '/test/flp.html#app-preview',
        pages: {
			onTheChangeLogList: ChangeLogList,
			onTheChangeLogObjectPage: ChangeLogObjectPage,
			onTheChangeLogChangesObjectPage: ChangeLogChangesObjectPage
        },
        async: true
    });

    return runner;
});


using { Fiorielements as my } from '../db/schema.cds';

@path : '/service/FiorielementsService'
service FiorielementsService
{
    @cds.redirection.target
    @odata.draft.enabled
    entity Products as projection on my.Products;

    @readonly
    entity ProductManagers as projection on my.ProductManagers;
    @readonly 
    entity ProductNumbers as projection on my.ProductNumbers;
    @readonly 
    entity ProductNames as projection on my.ProductNames;
    @readonly 
    entity ProductStatuses as projection on my.ProductStatuses;
    @readonly 
    entity ProductTypes as projection on my.ProductTypes;

    // ============================================================================
    // Chat & AI
    // ============================================================================
    action ask(question: String, sessionId: String) returns { 
        answer: String 
    };

    @readonly
    entity Prompts as projection on my.Prompts;
    
    @readonly
    entity Assistants as projection on my.Assistants;

    // ============================================================================
    // Companies, Activities, Plans
    // ============================================================================
    
    entity Companies as projection on my.Companies;
    
    @odata.draft.enabled
    entity Activities as projection on my.Activities;
    
    @odata.draft.enabled
    entity Plans as projection on my.Plans;

    entity ChatSessions as projection on my.ChatSessions;
    
    entity ChatMessages as projection on my.ChatMessages;

    entity messages as projection on my.messages;

    // ============================================================================
    // Business Actions
    // ============================================================================
    
    action createActivity(
        companyId   : String,
        hours       : Integer,
        description : String,
        date        : String
    );

    action createPlan(
        projectName : String,
        date        : String,
        hours       : Integer
    );

    action getActivityReport() returns {
        summary_text : String;
        chart_data   : array of {
            Project : String;
            Hours   : Integer;
        };
    };

    // ============================================================================
    // ChangeLog
    // ============================================================================
    @readonly
    entity ChangeLog as projection on my.ChangeLog {
        *,
        changes : redirected to ChangeLogChanges, 
        virtual appName : String
    };

    @cds.redirection.target: false
    entity ChangeLogEntities as projection on my.ChangeLogEntities;

    @cds.redirection.target: false
    entity ChangeLogUsers as projection on my.ChangeLogUsers;

    @cds.redirection.target: false
    entity ChangeLogChangedFields as projection on my.ChangeLogChangedFields;

    entity ChangeLogChanges as projection on my.ChangeLogChanges;

    @cds.redirection.target: false
    entity ChangeLogChangeTypes as select from ChangeLogChanges distinct {
        key modification
    };
}

annotate FiorielementsService with @requires :
[
    'authenticated-user'
];
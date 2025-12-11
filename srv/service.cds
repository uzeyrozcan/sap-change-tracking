using { Fiorielements as my } from '../db/schema.cds';
using {sap.changelog as sapChangelog} from '@cap-js/change-tracking';

@path : '/service/FiorielementsService'
service FiorielementsService
{
    @cds.redirection.target
    @odata.draft.enabled
    entity Products as projection on my.Products;

    @readonly
    entity ProductManagers as projection on my.ProductManagers;
    @readonly entity ProductNumbers as projection on my.ProductNumbers;
    @readonly entity ProductNames as projection on my.ProductNames;
    @readonly entity ProductStatuses as projection on my.ProductStatuses;
    @readonly entity ProductTypes as projection on my.ProductTypes;

    action ask(question: String) returns { answer: String };
    
    entity messages as projection on my.messages;

    // --- DÜZELTME BURADA ---
    entity ChangeLog as projection on my.ChangeLog {
        *,
        // 'changes' ilişkisini servis içindeki 'ChangeLogChanges' entity'sine yönlendiriyoruz
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
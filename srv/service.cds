using { Fiorielements as my } from '../db/schema.cds';
using {sap.changelog as sapChangelog} from '@cap-js/change-tracking';


@path : '/service/FiorielementsService'
service FiorielementsService
{
    @cds.redirection.target
    @odata.draft.enabled
    entity Products as
        projection on my.Products;

    
    entity ChangeLog                       as
        projection on my.ChangeLog {
                        *,
                                    virtual appName : String
                                            };
    /*extend projection FiorielementsService.ChangeLog with {
    changes : Association to many FiorielementsService.ChangeLogChanges
        on changes.change_ID = ID; //burada kendi schema’ndaki doğru alanı kullan
    };*/

    @cds.redirection.target: false
    entity ChangeLogEntities               as projection on my.ChangeLogEntities;

    @cds.redirection.target: false
    entity ChangeLogUsers                  as projection on my.ChangeLogUsers;

    @cds.redirection.target: false
    entity ChangeLogChangedFields          as projection on my.ChangeLogChangedFields;

    entity ChangeLogChanges                as projection on my.ChangeLogChanges;

    @cds.redirection.target: false
    entity ChangeLogChangeTypes            as
        select from ChangeLogChanges distinct {
            key modification
        };
}

annotate FiorielementsService with @requires :
[
    'authenticated-user'
];



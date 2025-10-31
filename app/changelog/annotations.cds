using FiorielementsService as service from '../../srv/service';
annotate service.ChangeLog with @(
    UI.HeaderInfo                            : {
        TypeName      : '{@i18n>lblLogsTitle}',
        TypeNamePlural: '{@i18n>lblLogsTitlePlural}',
        Title         : {
            $Type: 'UI.DataField',
            Value: serviceEntity
        },
        Description   : {
            $Type: 'UI.DataField',
            Value: modifiedAt
        }
    },

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : createdAt,
            },
            {
                $Type : 'UI.DataField',
                Value : createdBy,
            },
            {
                $Type : 'UI.DataField',
                Value : serviceEntity,
            },
            {
                $Type : 'UI.DataField',
                Value : entity,
            },
            {
                $Type : 'UI.DataField',
                Value : entityKey,
            },
            {
                $Type : 'UI.DataField',
                Label : 'appName',
                Value : appName,
            },
        ],
    },
    /*UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : '{i18n>GeneralInformation}',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],*/
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : createdAt,
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
        },
        {
            $Type : 'UI.DataField',
            Value : serviceEntity,
        },
        {
            $Type : 'UI.DataField',
            Value : entity,
        },
        {
            $Type : 'UI.DataField',
            Value : entityKey,
        },
    ],
);

// -------------------------------------------------------
// Change Logs tab (Field / ChangeType / Old / New)
// -------------------------------------------------------

annotate service.ChangeLog with @(
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneratedFacet1',
            Label : '{i18n>GeneralInformation}',
            Target: '@UI.FieldGroup#GeneratedGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'ChangeLogsFacet',
            Label : '{i18n>ChangeLogs}',
            Target: 'changes/@UI.LineItem#ChangeLog'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'changes',
            ID : 'changes',
            Target : 'changes/@UI.LineItem#changes',
        },
    ]
);

annotate service.ChangeLog.changes with @(
    UI : {
        LineItem #ChangeLog : [
            { Value : attribute,    Label : '{i18n>Field}' },
            { Value : modification, Label : '{i18n>ChangeType}' },
            { Value : oldValue,     Label : '{i18n>OldValue}' },
            { Value : newValue,     Label : '{i18n>NewValue}' }
        ],
        PresentationVariant #ChangeLog : {
            Visualizations : [ { $Type : 'UI.LineItem', Qualifier : 'ChangeLog' } ],
            SortOrder      : [ { Property : createdAt, Descending : true } ]
        }
    }
);



annotate service.ChangeLogChanges with @(
    UI.LineItem #changes : [
        {
            $Type : 'UI.DataField',
            Value : attribute,
        },
        {
            $Type : 'UI.DataField',
            Value : modification,
        },
        {
            $Type : 'UI.DataField',
            Value : valueChangedFrom,
        },
        {
            $Type : 'UI.DataField',
            Value : valueChangedTo,
        },
    ]
);


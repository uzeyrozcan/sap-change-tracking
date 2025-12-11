using FiorielementsService as service from '../../srv/service';

annotate service.Products with @(
    // --- 1. Başlık ve Liste Ayarları (Zaten Vardı) ---
    UI.HeaderInfo : {
        TypeName : 'Product',
        TypeNamePlural : 'Products',
        Title : { Value : prodName },
        Description : { Value : prodNumber }
    },
    UI.SelectionFields : [ prodNumber, prodName, prodManager, prodStatus, prodType ],
    
    UI.LineItem : [
        { $Type : 'UI.DataField', Value : prodNumber, Label : 'Product Number' },
        { $Type : 'UI.DataField', Value : prodName, Label : 'Product Name' },
        { $Type : 'UI.DataField', Value : prodManager, Label : 'Product Manager' },
        { $Type : 'UI.DataField', Value : prodType, Label : 'Product Type' },
        { $Type : 'UI.DataField', Value : prodStatus, Label : 'Product Status', Criticality : #Positive },
        { $Type : 'UI.DataField', Value : industry, Label : 'Industry' },
        { $Type : 'UI.DataField', Value : lineOfBusiness, Label : 'Line of Business' },
        { $Type : 'UI.DataField', Value : legalOwner, Label : 'Legal Owner' }
    ],

    // --- 2. OBJECT PAGE AYARLARI (YENİ EKLENEN KISIM) ---

    // Sayfa Yapısı (Facets)
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralData'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'DetailsFacet',
            Label : 'Technical Details',
            Target : '@UI.FieldGroup#TechData'
        }
    ],

    // Grup 1: Genel Bilgiler İçeriği
    UI.FieldGroup #GeneralData : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : prodName },
            { $Type : 'UI.DataField', Value : prodNumber },
            { $Type : 'UI.DataField', Value : prodManager },
            { $Type : 'UI.DataField', Value : legalOwner }
        ]
    },

    // Grup 2: Teknik Detaylar İçeriği
    UI.FieldGroup #TechData : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : prodType },
            { $Type : 'UI.DataField', Value : prodStatus, Criticality : #Positive },
            { $Type : 'UI.DataField', Value : industry },
            { $Type : 'UI.DataField', Value : lineOfBusiness }
        ]
    }
);

annotate service.Products with {
    prodManager @(
        Search.defaultSearchElement : true,
        Common.ValueList : {
            Label : 'Product Managers',
            CollectionPath : 'ProductManagers',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : prodManager, ValueListProperty : 'prodManager' }
            ]
        }
    );

    prodNumber @(
        Search.defaultSearchElement : true,
        Common.ValueList : {
            Label : 'Product Numbers',
            CollectionPath : 'ProductNumbers',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : prodNumber, ValueListProperty : 'prodNumber' }
            ]
        }
    );

    prodName @(
        Search.defaultSearchElement : true,
        Common.ValueList : {
            Label : 'Product Names',
            CollectionPath : 'ProductNames',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : prodName, ValueListProperty : 'prodName' }
            ]
        }
    );

    prodStatus @(
        Common.ValueListWithFixedValues : true,
        
        Search.defaultSearchElement : true,
        Common.ValueList : {
            Label : 'Product Statuses',
            CollectionPath : 'ProductStatuses',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : prodStatus, ValueListProperty : 'prodStatus' }
            ]
        }
    );
   prodType @(
        Common.ValueListWithFixedValues : true,

        Search.defaultSearchElement : true,
        Common.ValueList : {
            Label : 'Product Types',
            CollectionPath : 'ProductTypes',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : prodType, ValueListProperty : 'prodType' }
            ]
        }
    );
};
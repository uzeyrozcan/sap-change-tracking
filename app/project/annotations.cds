using FiorielementsService as service from '../../srv/service';

annotate service.Products with @(
  UI : {
    FieldGroup #GeneralInfo : {
      Data : [
        {
          $Type : 'UI.DataField',
          Label : '{i18n>lblProductName}',
          Value : prodName
        },
        {
          $Type : 'UI.DataField',
          Label : '{i18n>lblProductNumber}',
          Value : prodNumber
        }
      ]
    },

    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'GeneralInformationFacet',
        Label  : '{i18n>GeneralInformation}',
        Target : '@UI.FieldGroup#GeneralInfo'
      }
    ],

    LineItem : [
      {
        $Type : 'UI.DataField',
        Label : '{i18n>lblProductName}',
        Value : prodName
      },
      {
        $Type : 'UI.DataField',
        Label : '{i18n>lblProductNumber}',
        Value : prodNumber
      }
    ]
  }
);

using {FiorielementsService} from './service';
using from '@cap-js/change-tracking';


annotate FiorielementsService.Products with {
  prodName @changelog;
  prodNumber @changelog;
}

annotate sap.changelog.aspect @(UI.Facets: [{
  $Type : 'UI.ReferenceFacet',
  ID    : 'ChangeHistoryFacet',
  Label : '{i18n>ChangeHistory}',
  Target: 'changes/@UI.PresentationVariant',
  ![@UI.Hidden],
}]);
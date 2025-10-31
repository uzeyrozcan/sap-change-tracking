namespace Fiorielements;
using {sap.changelog as sapChangelog} from '@cap-js/change-tracking';

entity Products
{
    key ID : UUID;
    prodName : String(100);
    prodNumber : String(50);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// App ChangeLog
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
@readonly
entity ChangeLog              as projection on sapChangelog.ChangeLog;

@Capabilities.SearchRestrictions: {Searchable: true}
entity ChangeLogChanges       as projection on sapChangelog.Changes;

entity ChangeLogEntities      as
  select from ChangeLog distinct {
    key entity
  };

entity ChangeLogUsers         as
  select from ChangeLog distinct {
    key createdBy
  };

entity ChangeLogChangeTypes   as
  select from ChangeLogChanges distinct {
    key modification
  };

entity ChangeLogChangedFields as
  select from ChangeLogChanges distinct {
    key attribute
  };